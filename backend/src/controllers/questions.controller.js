// backend/src/controllers/questions.controller.js
const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /api/questions
 * List questions with filters, pagination, search
 */
const getQuestions = async (req, res) => {
  const {
    page = 1, limit = 20, category, tags, status = 'open,answered',
    sort = 'activity', search, author, featured
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const statuses = status.split(',').filter(Boolean);

  try {
    let whereConditions = ["q.status = ANY($1::question_status[])"];
    const params = [statuses];
    let paramIdx = 2;

    if (category) {
      whereConditions.push(`c.slug = $${paramIdx++}`);
      params.push(category);
    }

    if (search) {
      whereConditions.push(`(q.search_vector @@ plainto_tsquery('english', $${paramIdx}) OR q.title ILIKE $${paramIdx + 1})`);
      params.push(search, `%${search}%`);
      paramIdx += 2;
    }

    if (author) {
      whereConditions.push(`u.username = $${paramIdx++}`);
      params.push(author);
    }

    if (featured === 'true') {
      whereConditions.push('q.is_featured = true');
    }

    if (tags) {
      const tagList = tags.split(',');
      whereConditions.push(`EXISTS (
        SELECT 1 FROM question_tags qt 
        JOIN tags t ON t.id = qt.tag_id 
        WHERE qt.question_id = q.id AND t.slug = ANY($${paramIdx++}::text[])
      )`);
      params.push(tagList);
    }

    const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const sortMap = {
      activity: 'q.last_activity_at DESC',
      newest: 'q.created_at DESC',
      votes: 'q.vote_score DESC',
      answers: 'q.answer_count DESC',
      views: 'q.view_count DESC',
      unanswered: 'q.answer_count ASC, q.created_at DESC',
    };
    const orderBy = sortMap[sort] || sortMap.activity;

    const countQuery = `
      SELECT COUNT(DISTINCT q.id) as total
      FROM questions q
      LEFT JOIN users u ON q.author_id = u.id
      LEFT JOIN categories c ON q.category_id = c.id
      ${whereClause}
    `;

    const dataQuery = `
      SELECT 
        q.id, q.title, q.status, q.vote_score, q.view_count, q.answer_count,
        q.is_anonymous, q.is_featured, q.is_wiki, q.created_at, q.last_activity_at,
        q.accepted_answer_id,
        CASE WHEN q.is_anonymous THEN NULL ELSE json_build_object(
          'id', u.id, 'username', u.username, 'full_name', u.full_name, 
          'avatar_url', u.avatar_url, 'reputation_score', u.reputation_score, 'role', u.role
        ) END as author,
        json_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'color', c.color) as category,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'color', t.color))
          FILTER (WHERE t.id IS NOT NULL), '[]'
        ) as tags
      FROM questions q
      LEFT JOIN users u ON q.author_id = u.id
      LEFT JOIN categories c ON q.category_id = c.id
      LEFT JOIN question_tags qt ON q.id = qt.question_id
      LEFT JOIN tags t ON qt.tag_id = t.id
      ${whereClause}
      GROUP BY q.id, u.id, c.id
      ORDER BY ${orderBy}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    params.push(parseInt(limit), offset);

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, params.slice(0, paramIdx - 1)),
      pool.query(dataQuery, params),
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        questions: dataResult.rows,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages },
      },
    });
  } catch (err) {
    logger.error('Get questions error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch questions' });
  }
};

/**
 * POST /api/questions
 * Create a new question
 */
const createQuestion = async (req, res) => {
  const { title, body, body_text, category_id, tags = [], is_anonymous = false } = req.body;
  const authorId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const qResult = await client.query(
      `INSERT INTO questions (author_id, category_id, title, body, body_text, is_anonymous)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [authorId, category_id || null, title, body, body_text || body.replace(/<[^>]*>/g, ''), is_anonymous]
    );
    const question = qResult.rows[0];

    // Add tags
    if (tags.length > 0) {
      for (const tagId of tags) {
        await client.query(
          'INSERT INTO question_tags (question_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [question.id, tagId]
        );
        await client.query('UPDATE tags SET usage_count = usage_count + 1 WHERE id = $1', [tagId]);
      }
    }

    // Update user stats
    await client.query('UPDATE users SET question_count = question_count + 1 WHERE id = $1', [authorId]);

    // Award reputation
    await client.query(
      "INSERT INTO reputation_history (user_id, delta, reason, question_id) VALUES ($1, 2, 'asked_question', $2)",
      [authorId, question.id]
    );
    await client.query('UPDATE users SET reputation_score = reputation_score + 2 WHERE id = $1', [authorId]);

    // Log activity
    await client.query(
      "INSERT INTO activity_logs (user_id, action, entity_type, entity_id) VALUES ($1,'asked_question','question',$2)",
      [authorId, question.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Question posted successfully',
      data: { question },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Create question error:', err);
    res.status(500).json({ success: false, message: 'Failed to post question' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/questions/:id
 * Get question detail
 */
const getQuestion = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const result = await pool.query(
      `SELECT 
        q.*,
        CASE WHEN q.is_anonymous THEN NULL ELSE json_build_object(
          'id', u.id, 'username', u.username, 'full_name', u.full_name,
          'avatar_url', u.avatar_url, 'reputation_score', u.reputation_score, 
          'role', u.role, 'department', u.department, 'designation', u.designation
        ) END as author,
        json_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'icon', c.icon, 'color', c.color) as category,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'color', t.color))
          FILTER (WHERE t.id IS NOT NULL), '[]'
        ) as tags
      FROM questions q
      LEFT JOIN users u ON q.author_id = u.id
      LEFT JOIN categories c ON q.category_id = c.id
      LEFT JOIN question_tags qt ON q.id = qt.question_id
      LEFT JOIN tags t ON qt.tag_id = t.id
      WHERE q.id = $1 AND q.status != 'deleted'
      GROUP BY q.id, u.id, c.id`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const question = result.rows[0];

    // Get user's vote
    if (userId) {
      const voteResult = await pool.query(
        'SELECT vote_type FROM votes WHERE user_id=$1 AND question_id=$2',
        [userId, id]
      );
      question.user_vote = voteResult.rows[0]?.vote_type || null;

      const bookmarkResult = await pool.query(
        'SELECT 1 FROM bookmarks WHERE user_id=$1 AND question_id=$2',
        [userId, id]
      );
      question.is_bookmarked = bookmarkResult.rows.length > 0;
    }

    // Increment view count (async, non-blocking)
    pool.query('UPDATE questions SET view_count = view_count + 1 WHERE id = $1', [id]);

    // Track analytics
    pool.query(
      'INSERT INTO faq_analytics (question_id, user_id, ip_address) VALUES ($1,$2,$3)',
      [id, userId || null, req.ip]
    );

    res.json({ success: true, data: { question } });
  } catch (err) {
    logger.error('Get question error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch question' });
  }
};

/**
 * PUT /api/questions/:id
 * Update question (author or admin)
 */
const updateQuestion = async (req, res) => {
  const { id } = req.params;
  const { title, body, body_text, category_id, tags, edit_comment } = req.body;
  const userId = req.user.id;

  try {
    const existing = await pool.query('SELECT * FROM questions WHERE id=$1 AND status != $2', [id, 'deleted']);
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const question = existing.rows[0];
    if (question.author_id !== userId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this question' });
    }

    // Save revision
    await pool.query(
      'INSERT INTO question_revisions (question_id, editor_id, title, body, edit_comment) VALUES ($1,$2,$3,$4,$5)',
      [id, userId, question.title, question.body, edit_comment || 'Edited']
    );

    const updates = {};
    if (title) updates.title = title;
    if (body) { updates.body = body; updates.body_text = body_text || body.replace(/<[^>]*>/g, ''); }
    if (category_id !== undefined) updates.category_id = category_id;

    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
      await pool.query(
        `UPDATE questions SET ${setClauses}, updated_at = NOW() WHERE id = $1`,
        [id, ...Object.values(updates)]
      );
    }

    // Update tags if provided
    if (tags !== undefined) {
      await pool.query('DELETE FROM question_tags WHERE question_id = $1', [id]);
      for (const tagId of tags) {
        await pool.query('INSERT INTO question_tags (question_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, tagId]);
      }
    }

    res.json({ success: true, message: 'Question updated successfully' });
  } catch (err) {
    logger.error('Update question error:', err);
    res.status(500).json({ success: false, message: 'Failed to update question' });
  }
};

/**
 * DELETE /api/questions/:id
 */
const deleteQuestion = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const existing = await pool.query('SELECT author_id FROM questions WHERE id=$1', [id]);
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    if (existing.rows[0].author_id !== userId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await pool.query("UPDATE questions SET status='deleted' WHERE id=$1", [id]);
    res.json({ success: true, message: 'Question deleted' });
  } catch (err) {
    logger.error('Delete question error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete question' });
  }
};

/**
 * POST /api/questions/:id/vote
 */
const voteQuestion = async (req, res) => {
  const { id } = req.params;
  const { vote_type } = req.body; // 'upvote' or 'downvote'
  const userId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check question exists
    const qResult = await client.query('SELECT author_id, vote_score FROM questions WHERE id=$1', [id]);
    if (!qResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    // Can't vote own question
    if (qResult.rows[0].author_id === userId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: "You can't vote your own question" });
    }

    // Check existing vote
    const existing = await client.query('SELECT * FROM votes WHERE user_id=$1 AND question_id=$2', [userId, id]);
    let delta = 0;
    let newVote = null;

    if (existing.rows.length) {
      const currentVote = existing.rows[0].vote_type;
      if (currentVote === vote_type) {
        // Remove vote
        await client.query('DELETE FROM votes WHERE user_id=$1 AND question_id=$2', [userId, id]);
        delta = vote_type === 'upvote' ? -1 : 1;
        newVote = null;
      } else {
        // Change vote
        await client.query('UPDATE votes SET vote_type=$1 WHERE user_id=$2 AND question_id=$3', [vote_type, userId, id]);
        delta = vote_type === 'upvote' ? 2 : -2;
        newVote = vote_type;
      }
    } else {
      // New vote
      await client.query('INSERT INTO votes (user_id, question_id, vote_type) VALUES ($1,$2,$3)', [userId, id, vote_type]);
      delta = vote_type === 'upvote' ? 1 : -1;
      newVote = vote_type;
    }

    // Update question score
    await client.query('UPDATE questions SET vote_score = vote_score + $1 WHERE id = $2', [delta, id]);

    // Update author reputation
    const repDelta = delta * (vote_type === 'upvote' ? 5 : 2);
    await client.query('UPDATE users SET reputation_score = reputation_score + $1 WHERE id = $2', [repDelta, qResult.rows[0].author_id]);

    const updatedQ = await client.query('SELECT vote_score FROM questions WHERE id=$1', [id]);
    await client.query('COMMIT');

    res.json({
      success: true,
      data: { vote_score: updatedQ.rows[0].vote_score, user_vote: newVote },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Vote question error:', err);
    res.status(500).json({ success: false, message: 'Failed to vote' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/questions/trending
 */
const getTrending = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT q.id, q.title, q.vote_score, q.view_count, q.answer_count, q.created_at,
        json_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'color', c.color) as category
      FROM questions q
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE q.status IN ('open','answered') 
        AND q.created_at > NOW() - INTERVAL '7 days'
      ORDER BY (q.vote_score * 3 + q.view_count * 0.1 + q.answer_count * 2) DESC
      LIMIT 10
    `);
    res.json({ success: true, data: { questions: result.rows } });
  } catch (err) {
    logger.error('Get trending error:', err);
    res.status(500).json({ success: false, message: 'Failed to get trending questions' });
  }
};

/**
 * POST /api/questions/:id/bookmark
 */
const bookmarkQuestion = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const existing = await pool.query('SELECT 1 FROM bookmarks WHERE user_id=$1 AND question_id=$2', [userId, id]);
    if (existing.rows.length) {
      await pool.query('DELETE FROM bookmarks WHERE user_id=$1 AND question_id=$2', [userId, id]);
      return res.json({ success: true, data: { bookmarked: false } });
    }
    await pool.query('INSERT INTO bookmarks (user_id, question_id) VALUES ($1,$2)', [userId, id]);
    res.json({ success: true, data: { bookmarked: true } });
  } catch (err) {
    logger.error('Bookmark error:', err);
    res.status(500).json({ success: false, message: 'Failed to bookmark' });
  }
};

/**
 * GET /api/questions/search/similar?q=...
 * AI-powered similar question detection
 */
const getSimilarQuestions = async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ success: true, data: { questions: [] } });

  try {
    const result = await pool.query(`
      SELECT q.id, q.title, q.vote_score, q.answer_count,
        ts_rank(q.search_vector, plainto_tsquery('english', $1)) as rank
      FROM questions q
      WHERE q.search_vector @@ plainto_tsquery('english', $1)
        OR q.title % $2
      ORDER BY rank DESC, q.vote_score DESC
      LIMIT 5
    `, [q, q]);

    res.json({ success: true, data: { questions: result.rows } });
  } catch (err) {
    logger.error('Similar questions error:', err);
    res.status(500).json({ success: false, message: 'Failed to find similar questions' });
  }
};

module.exports = {
  getQuestions, createQuestion, getQuestion, updateQuestion,
  deleteQuestion, voteQuestion, getTrending, bookmarkQuestion, getSimilarQuestions
};
