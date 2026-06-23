// backend/src/controllers/analytics.controller.js
const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /api/analytics/overview
 */
const getOverview = async (req, res) => {
  try {
    const [users, questions, answers, categories] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE created_at > NOW()-INTERVAL\'7d\') as week_new FROM users WHERE status=\'active\''),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status=\'answered\') as answered, COUNT(*) FILTER (WHERE created_at > NOW()-INTERVAL\'7d\') as week_new FROM questions WHERE status!=\'deleted\''),
      pool.query('SELECT COUNT(*) as total FROM answers'),
      pool.query('SELECT name, question_count FROM categories ORDER BY question_count DESC LIMIT 5'),
    ]);

    const engagementRate = questions.rows[0].total > 0
      ? Math.round((questions.rows[0].answered / questions.rows[0].total) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        stats: {
          total_users: parseInt(users.rows[0].total),
          new_users_week: parseInt(users.rows[0].week_new),
          total_questions: parseInt(questions.rows[0].total),
          answered_questions: parseInt(questions.rows[0].answered),
          new_questions_week: parseInt(questions.rows[0].week_new),
          total_answers: parseInt(answers.rows[0].total),
          engagement_rate: engagementRate,
        },
        top_categories: categories.rows,
      },
    });
  } catch (err) {
    logger.error('Analytics overview error:', err);
    res.status(500).json({ success: false, message: 'Failed to get analytics' });
  }
};

/**
 * GET /api/analytics/heatmap
 * Category heatmap data
 */
const getCategoryHeatmap = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.name, c.slug, c.color, c.icon,
        c.question_count,
        COUNT(a.id) FILTER (WHERE a.created_at > NOW()-INTERVAL'30d') as recent_answers,
        AVG(q.vote_score)::numeric(4,1) as avg_vote_score,
        SUM(q.view_count) as total_views
      FROM categories c
      LEFT JOIN questions q ON q.category_id = c.id AND q.status != 'deleted'
      LEFT JOIN answers a ON a.question_id = q.id
      GROUP BY c.id
      ORDER BY c.question_count DESC
    `);
    res.json({ success: true, data: { categories: result.rows } });
  } catch (err) {
    logger.error('Heatmap error:', err);
    res.status(500).json({ success: false, message: 'Failed to get heatmap data' });
  }
};

/**
 * GET /api/analytics/activity
 * Daily activity for charts
 */
const getActivityTimeline = async (req, res) => {
  const { days = 30 } = req.query;
  try {
    const result = await pool.query(`
      SELECT 
        date_trunc('day', generate_series) as date,
        COALESCE(q_count.questions, 0) as questions,
        COALESCE(a_count.answers, 0) as answers,
        COALESCE(u_count.users, 0) as users
      FROM generate_series(
        NOW() - INTERVAL '1 day' * $1, NOW(), INTERVAL '1 day'
      ) generate_series
      LEFT JOIN (
        SELECT date_trunc('day', created_at) as d, COUNT(*) as questions FROM questions GROUP BY d
      ) q_count ON q_count.d = date_trunc('day', generate_series)
      LEFT JOIN (
        SELECT date_trunc('day', created_at) as d, COUNT(*) as answers FROM answers GROUP BY d
      ) a_count ON a_count.d = date_trunc('day', generate_series)
      LEFT JOIN (
        SELECT date_trunc('day', created_at) as d, COUNT(*) as users FROM users GROUP BY d
      ) u_count ON u_count.d = date_trunc('day', generate_series)
      ORDER BY date
    `, [parseInt(days)]);

    res.json({ success: true, data: { timeline: result.rows } });
  } catch (err) {
    logger.error('Activity timeline error:', err);
    res.status(500).json({ success: false, message: 'Failed to get activity' });
  }
};

/**
 * GET /api/analytics/knowledge-graph
 * Data for knowledge graph visualization
 */
const getKnowledgeGraph = async (req, res) => {
  try {
    // Get tag relationships through co-occurrence in questions
    const nodesResult = await pool.query(`
      SELECT t.id, t.name, t.slug, t.usage_count, t.color
      FROM tags t WHERE t.usage_count > 0
      ORDER BY t.usage_count DESC LIMIT 30
    `);

    const edgesResult = await pool.query(`
      SELECT qt1.tag_id as source, qt2.tag_id as target, COUNT(*) as weight
      FROM question_tags qt1
      JOIN question_tags qt2 ON qt1.question_id = qt2.question_id AND qt1.tag_id < qt2.tag_id
      WHERE qt1.tag_id = ANY($1) AND qt2.tag_id = ANY($1)
      GROUP BY qt1.tag_id, qt2.tag_id
      HAVING COUNT(*) > 0
      LIMIT 100
    `, [nodesResult.rows.map(n => n.id)]);

    res.json({
      success: true,
      data: {
        nodes: nodesResult.rows,
        edges: edgesResult.rows,
      },
    });
  } catch (err) {
    logger.error('Knowledge graph error:', err);
    res.status(500).json({ success: false, message: 'Failed to get knowledge graph' });
  }
};

/**
 * GET /api/analytics/research-map
 * Research interest mapping
 */
const getResearchMap = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.name as topic, t.usage_count as mentions,
        c.name as category,
        json_agg(DISTINCT u.department) FILTER (WHERE u.department IS NOT NULL) as departments
      FROM tags t
      JOIN question_tags qt ON t.id = qt.tag_id
      JOIN questions q ON qt.question_id = q.id
      JOIN users u ON q.author_id = u.id
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE t.usage_count > 0 AND q.status != 'deleted'
      GROUP BY t.id, c.name
      ORDER BY t.usage_count DESC LIMIT 20
    `);
    res.json({ success: true, data: { topics: result.rows } });
  } catch (err) {
    logger.error('Research map error:', err);
    res.status(500).json({ success: false, message: 'Failed to get research map' });
  }
};

module.exports = { getOverview, getCategoryHeatmap, getActivityTimeline, getKnowledgeGraph, getResearchMap };
