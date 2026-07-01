// backend/src/controllers/answers.controller.js
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const { sendEmail, emailTemplates } = require('../utils/email');

/**
 * GET /api/questions/:questionId/answers
 */
const getAnswers = async (req, res) => {
  const { questionId } = req.params;
  const userId = req.user?.id;

  try {
    const result = await pool.query(`
      SELECT 
        a.*,
        CASE WHEN a.is_anonymous THEN NULL ELSE json_build_object(
          'id', u.id, 'username', u.username, 'full_name', u.full_name,
          'avatar_url', u.avatar_url, 'reputation_score', u.reputation_score,
          'role', u.role, 'designation', u.designation
        ) END as author,
        (SELECT json_agg(
          json_build_object(
            'id', c.id, 'body', c.body, 'created_at', c.created_at,
            'author', CASE WHEN c.is_anonymous THEN NULL ELSE json_build_object(
              'username', cu.username, 'avatar_url', cu.avatar_url
            ) END
          ) ORDER BY c.created_at
        ) FROM comments c LEFT JOIN users cu ON c.author_id = cu.id 
        WHERE c.answer_id = a.id) as comments
      FROM answers a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.question_id = $1
      ORDER BY a.is_accepted DESC, a.is_verified DESC, a.vote_score DESC, a.created_at ASC
    `, [questionId]);

    // Get user votes if authenticated
    if (userId && result.rows.length) {
      const answerIds = result.rows.map(a => a.id);
      const voteResult = await pool.query(
        'SELECT answer_id, vote_type FROM votes WHERE user_id=$1 AND answer_id = ANY($2)',
        [userId, answerIds]
      );
      const voteMap = {};
      voteResult.rows.forEach(v => { voteMap[v.answer_id] = v.vote_type; });

      const validationResult = await pool.query(
        'SELECT answer_id FROM answer_validations WHERE user_id=$1 AND answer_id = ANY($2)',
        [userId, answerIds]
      );
      const validatedSet = new Set(validationResult.rows.map(v => v.answer_id));

      result.rows.forEach(a => {
        a.user_vote = voteMap[a.id] || null;
        a.user_validated = validatedSet.has(a.id);
      });
    }

    res.json({ success: true, data: { answers: result.rows } });
  } catch (err) {
    logger.error('Get answers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch answers' });
  }
};

/**
 * POST /api/questions/:questionId/answers
 */
const createAnswer = async (req, res) => {
  const { questionId } = req.params;
  const { body, body_text, is_anonymous = false, ai_assisted = false } = req.body;
  const authorId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check question exists and is open
    const qResult = await client.query(
      'SELECT id, author_id, title FROM questions WHERE id=$1 AND status IN ($2,$3)',
      [questionId, 'open', 'answered']
    );
    if (!qResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Question not found or closed' });
    }

    const question = qResult.rows[0];

    const aResult = await client.query(
      `INSERT INTO answers (question_id, author_id, body, body_text, is_anonymous, ai_assisted)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [questionId, authorId, body, body_text || body.replace(/<[^>]*>/g, ''), is_anonymous, ai_assisted]
    );
    const answer = aResult.rows[0];

    // Update question status if first answer
    await client.query(
      "UPDATE questions SET status='answered', last_activity_at=NOW() WHERE id=$1 AND status='open'",
      [questionId]
    );

    // Update user stats
    await client.query('UPDATE users SET answer_count = answer_count + 1 WHERE id = $1', [authorId]);

    // Award reputation for answering
    await client.query(
      "INSERT INTO reputation_history (user_id, delta, reason, answer_id) VALUES ($1, 5, 'posted_answer', $2)",
      [authorId, answer.id]
    );
    await client.query('UPDATE users SET reputation_score = reputation_score + 5 WHERE id = $1', [authorId]);

    // Notify question author
    if (question.author_id !== authorId) {
      await client.query(
        `INSERT INTO notifications (recipient_id, sender_id, type, title, message, data)
         VALUES ($1,$2,'new_answer',$3,$4,$5)`,
        [
          question.author_id, authorId,
          'New answer to your question',
          `Someone answered: "${question.title}"`,
          JSON.stringify({ question_id: questionId, answer_id: answer.id })
        ]
      );

      // Send email notification (non-blocking)
      const authorResult = await client.query('SELECT email, full_name, notification_email FROM users WHERE id=$1', [question.author_id]);
      const answererResult = await client.query('SELECT full_name FROM users WHERE id=$1', [authorId]);
      if (authorResult.rows[0]?.notification_email) {
        const questionUrl = `${process.env.CLIENT_URL}/questions/${questionId}`;
        const template = emailTemplates.newAnswer(
          authorResult.rows[0].full_name,
          question.title,
          answererResult.rows[0]?.full_name || 'Someone',
          questionUrl
        );
        sendEmail({ to: authorResult.rows[0].email, ...template }).catch(err => logger.error('Email error:', err));
      }
    }

    // Log activity
    await client.query(
      "INSERT INTO activity_logs (user_id, action, entity_type, entity_id) VALUES ($1,'posted_answer','answer',$2)",
      [authorId, answer.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Answer posted successfully',
      data: { answer },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Create answer error:', err);
    res.status(500).json({ success: false, message: 'Failed to post answer' });
  } finally {
    client.release();
  }
};

/**
 * PUT /api/answers/:id
 */
const updateAnswer = async (req, res) => {
  const { id } = req.params;
  const { body, body_text, edit_comment } = req.body;
  const userId = req.user.id;

  try {
    const existing = await pool.query('SELECT * FROM answers WHERE id=$1', [id]);
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: 'Answer not found' });
    }

    const answer = existing.rows[0];
    if (answer.author_id !== userId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Save revision
    await pool.query(
      'INSERT INTO answer_revisions (answer_id, editor_id, body, edit_comment) VALUES ($1,$2,$3,$4)',
      [id, userId, answer.body, edit_comment || 'Edited']
    );

    await pool.query(
      'UPDATE answers SET body=$1, body_text=$2, updated_at=NOW() WHERE id=$3',
      [body, body_text || body.replace(/<[^>]*>/g, ''), id]
    );

    res.json({ success: true, message: 'Answer updated' });
  } catch (err) {
    logger.error('Update answer error:', err);
    res.status(500).json({ success: false, message: 'Failed to update answer' });
  }
};

/**
 * DELETE /api/answers/:id
 */
const deleteAnswer = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const existing = await pool.query('SELECT * FROM answers WHERE id=$1', [id]);
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: 'Answer not found' });
    }

    if (existing.rows[0].author_id !== userId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await pool.query('DELETE FROM answers WHERE id=$1', [id]);
    res.json({ success: true, message: 'Answer deleted' });
  } catch (err) {
    logger.error('Delete answer error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete answer' });
  }
};

/**
 * POST /api/answers/:id/accept
 * Question author accepts an answer
 */
const acceptAnswer = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const aResult = await client.query(
      'SELECT a.*, q.author_id as q_author FROM answers a JOIN questions q ON a.question_id = q.id WHERE a.id=$1',
      [id]
    );
    if (!aResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Answer not found' });
    }

    const answer = aResult.rows[0];
    if (answer.q_author !== userId && !['admin', 'superadmin'].includes(req.user.role)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Only question author can accept answers' });
    }

    // Unaccept any currently accepted answer
    await client.query(
      'UPDATE answers SET is_accepted=false WHERE question_id=$1 AND is_accepted=true',
      [answer.question_id]
    );

    // Accept this answer
    const isNowAccepted = !answer.is_accepted;
    await client.query('UPDATE answers SET is_accepted=$1 WHERE id=$2', [isNowAccepted, id]);
    await client.query(
      'UPDATE questions SET accepted_answer_id=$1, status=$2 WHERE id=$3',
      [isNowAccepted ? id : null, isNowAccepted ? 'answered' : 'open', answer.question_id]
    );

    if (isNowAccepted) {
      // Award reputation to answer author
      await client.query(
        "INSERT INTO reputation_history (user_id, delta, reason, answer_id) VALUES ($1, 15, 'answer_accepted', $2)",
        [answer.author_id, id]
      );
      await client.query('UPDATE users SET reputation_score = reputation_score + 15 WHERE id = $1', [answer.author_id]);

      // Notify answer author
      await client.query(
        `INSERT INTO notifications (recipient_id, sender_id, type, title, message, data)
         VALUES ($1,$2,'answer_accepted','Your answer was accepted','The question author accepted your answer!',$3)`,
        [answer.author_id, userId, JSON.stringify({ question_id: answer.question_id, answer_id: id })]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, data: { is_accepted: isNowAccepted } });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Accept answer error:', err);
    res.status(500).json({ success: false, message: 'Failed to accept answer' });
  } finally {
    client.release();
  }
};

/**
 * POST /api/answers/:id/vote
 */
const voteAnswer = async (req, res) => {
  const { id } = req.params;
  const { vote_type } = req.body;
  const userId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const aResult = await client.query('SELECT author_id, vote_score FROM answers WHERE id=$1', [id]);
    if (!aResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Answer not found' });
    }

    if (aResult.rows[0].author_id === userId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: "You can't vote your own answer" });
    }

    const existing = await client.query('SELECT * FROM votes WHERE user_id=$1 AND answer_id=$2', [userId, id]);
    let delta = 0;
    let newVote = null;

    if (existing.rows.length) {
      const currentVote = existing.rows[0].vote_type;
      if (currentVote === vote_type) {
        await client.query('DELETE FROM votes WHERE user_id=$1 AND answer_id=$2', [userId, id]);
        delta = vote_type === 'upvote' ? -1 : 1;
        newVote = null;
      } else {
        await client.query('UPDATE votes SET vote_type=$1 WHERE user_id=$2 AND answer_id=$3', [vote_type, userId, id]);
        delta = vote_type === 'upvote' ? 2 : -2;
        newVote = vote_type;
      }
    } else {
      await client.query('INSERT INTO votes (user_id, answer_id, vote_type) VALUES ($1,$2,$3)', [userId, id, vote_type]);
      delta = vote_type === 'upvote' ? 1 : -1;
      newVote = vote_type;
    }

    await client.query('UPDATE answers SET vote_score = vote_score + $1 WHERE id = $2', [delta, id]);
    const repDelta = delta * (vote_type === 'upvote' ? 10 : 2);
    await client.query('UPDATE users SET reputation_score = reputation_score + $1 WHERE id = $2', [repDelta, aResult.rows[0].author_id]);

    const updated = await client.query('SELECT vote_score FROM answers WHERE id=$1', [id]);
    await client.query('COMMIT');

    res.json({ success: true, data: { vote_score: updated.rows[0].vote_score, user_vote: newVote } });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Vote answer error:', err);
    res.status(500).json({ success: false, message: 'Failed to vote' });
  } finally {
    client.release();
  }
};

/**
 * POST /api/answers/:id/validate
 * Community validates an answer (crowd verification)
 */
const validateAnswer = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const existing = await pool.query(
      'SELECT 1 FROM answer_validations WHERE answer_id=$1 AND user_id=$2',
      [id, userId]
    );

    if (existing.rows.length) {
      await pool.query('DELETE FROM answer_validations WHERE answer_id=$1 AND user_id=$2', [id, userId]);
      await pool.query('UPDATE answers SET validation_count = validation_count - 1 WHERE id = $1', [id]);
      return res.json({ success: true, data: { validated: false } });
    }

    await pool.query('INSERT INTO answer_validations (answer_id, user_id) VALUES ($1,$2)', [id, userId]);
    await pool.query('UPDATE answers SET validation_count = validation_count + 1 WHERE id = $1', [id]);

    const updated = await pool.query('SELECT validation_count, is_verified FROM answers WHERE id=$1', [id]);
    res.json({ success: true, data: { validated: true, ...updated.rows[0] } });
  } catch (err) {
    logger.error('Validate answer error:', err);
    res.status(500).json({ success: false, message: 'Failed to validate' });
  }
};

module.exports = { getAnswers, createAnswer, updateAnswer, deleteAnswer, acceptAnswer, voteAnswer, validateAnswer };
