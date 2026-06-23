// backend/src/controllers/categories.controller.js
const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /api/categories
 */
const getCategories = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM questions q WHERE q.category_id = c.id AND q.status != 'deleted') as question_count
      FROM categories c 
      WHERE c.is_active = true 
      ORDER BY c.sort_order ASC, c.question_count DESC
    `);
    res.json({ success: true, data: { categories: result.rows } });
  } catch (err) {
    logger.error('Get categories error:', err);
    res.status(500).json({ success: false, message: 'Failed to get categories' });
  }
};

/**
 * GET /api/tags
 */
const getTags = async (req, res) => {
  const { search, limit = 50 } = req.query;

  try {
    let query, params;
    if (search) {
      query = `SELECT * FROM tags WHERE name ILIKE $1 ORDER BY usage_count DESC LIMIT $2`;
      params = [`%${search}%`, parseInt(limit)];
    } else {
      query = `SELECT * FROM tags ORDER BY usage_count DESC LIMIT $1`;
      params = [parseInt(limit)];
    }

    const result = await pool.query(query, params);
    res.json({ success: true, data: { tags: result.rows } });
  } catch (err) {
    logger.error('Get tags error:', err);
    res.status(500).json({ success: false, message: 'Failed to get tags' });
  }
};

/**
 * POST /api/tags  (create tag, authenticated users)
 */
const createTag = async (req, res) => {
  const { name, description, color } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  try {
    const result = await pool.query(
      `INSERT INTO tags (name, slug, description, color) VALUES ($1,$2,$3,$4) 
       ON CONFLICT (slug) DO UPDATE SET usage_count = tags.usage_count RETURNING *`,
      [name, slug, description || null, color || '#6366f1']
    );
    res.status(201).json({ success: true, data: { tag: result.rows[0] } });
  } catch (err) {
    logger.error('Create tag error:', err);
    res.status(500).json({ success: false, message: 'Failed to create tag' });
  }
};

/**
 * GET /api/comments?question_id=... (or answer_id)
 */
const getComments = async (req, res) => {
  const { question_id, answer_id } = req.query;

  try {
    let where;
    let params;
    if (question_id) { where = 'c.question_id = $1'; params = [question_id]; }
    else if (answer_id) { where = 'c.answer_id = $1'; params = [answer_id]; }
    else return res.status(400).json({ success: false, message: 'question_id or answer_id required' });

    const result = await pool.query(`
      SELECT c.id, c.body, c.is_anonymous, c.created_at, c.vote_score,
        CASE WHEN c.is_anonymous THEN NULL ELSE json_build_object(
          'id', u.id, 'username', u.username, 'avatar_url', u.avatar_url, 'role', u.role
        ) END as author
      FROM comments c LEFT JOIN users u ON c.author_id = u.id
      WHERE ${where}
      ORDER BY c.created_at ASC
    `, params);

    res.json({ success: true, data: { comments: result.rows } });
  } catch (err) {
    logger.error('Get comments error:', err);
    res.status(500).json({ success: false, message: 'Failed to get comments' });
  }
};

/**
 * POST /api/comments
 */
const createComment = async (req, res) => {
  const { body, question_id, answer_id, is_anonymous = false } = req.body;
  const authorId = req.user.id;

  try {
    const result = await pool.query(
      'INSERT INTO comments (author_id, question_id, answer_id, body, is_anonymous) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [authorId, question_id || null, answer_id || null, body, is_anonymous]
    );

    if (question_id) {
      await pool.query('UPDATE questions SET comment_count = comment_count + 1 WHERE id = $1', [question_id]);
    }
    if (answer_id) {
      await pool.query('UPDATE answers SET comment_count = comment_count + 1 WHERE id = $1', [answer_id]);
    }

    res.status(201).json({ success: true, data: { comment: result.rows[0] } });
  } catch (err) {
    logger.error('Create comment error:', err);
    res.status(500).json({ success: false, message: 'Failed to post comment' });
  }
};

/**
 * POST /api/reports
 */
const createReport = async (req, res) => {
  const { question_id, answer_id, comment_id, reason, description } = req.body;
  const reporterId = req.user.id;

  try {
    await pool.query(
      'INSERT INTO reports (reporter_id, question_id, answer_id, comment_id, reason, description) VALUES ($1,$2,$3,$4,$5,$6)',
      [reporterId, question_id || null, answer_id || null, comment_id || null, reason, description || null]
    );
    res.status(201).json({ success: true, message: 'Report submitted successfully' });
  } catch (err) {
    logger.error('Create report error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit report' });
  }
};

/**
 * GET /api/admin/reports  (admin only)
 */
const getReports = async (req, res) => {
  const { status = 'pending', page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const result = await pool.query(`
      SELECT r.*,
        json_build_object('username', u.username, 'email', u.email) as reporter,
        q.title as question_title
      FROM reports r
      LEFT JOIN users u ON r.reporter_id = u.id
      LEFT JOIN questions q ON r.question_id = q.id
      WHERE r.status = $1
      ORDER BY r.created_at DESC LIMIT $2 OFFSET $3
    `, [status, parseInt(limit), offset]);

    const count = await pool.query('SELECT COUNT(*) FROM reports WHERE status=$1', [status]);

    res.json({
      success: true,
      data: {
        reports: result.rows,
        pagination: { total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) },
      },
    });
  } catch (err) {
    logger.error('Get reports error:', err);
    res.status(500).json({ success: false, message: 'Failed to get reports' });
  }
};

module.exports = { getCategories, getTags, createTag, getComments, createComment, createReport, getReports };
