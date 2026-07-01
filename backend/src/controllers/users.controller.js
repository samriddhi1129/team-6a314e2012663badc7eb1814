// backend/src/controllers/users.controller.js
const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /api/users/leaderboard
 */
const getLeaderboard = async (req, res) => {
  const { period = 'all', limit = 20 } = req.query;

  let dateFilter = '';
  if (period === 'week') dateFilter = "AND rh.created_at > NOW() - INTERVAL '7 days'";
  else if (period === 'month') dateFilter = "AND rh.created_at > NOW() - INTERVAL '30 days'";

  try {
    let query;
    if (period === 'all') {
      query = `
        SELECT u.id, u.username, u.full_name, u.avatar_url, u.role, u.department,
          u.reputation_score, u.question_count, u.answer_count,
          (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = u.id) as badge_count
        FROM users u WHERE u.status = 'active'
        ORDER BY u.reputation_score DESC LIMIT $1
      `;
    } else {
      query = `
        SELECT u.id, u.username, u.full_name, u.avatar_url, u.role, u.department,
          u.reputation_score, u.question_count, u.answer_count,
          COALESCE(SUM(rh.delta), 0) as period_score,
          (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = u.id) as badge_count
        FROM users u
        LEFT JOIN reputation_history rh ON rh.user_id = u.id ${dateFilter}
        WHERE u.status = 'active'
        GROUP BY u.id
        ORDER BY period_score DESC, u.reputation_score DESC LIMIT $1
      `;
    }

    const result = await pool.query(query, [parseInt(limit)]);
    res.json({ success: true, data: { users: result.rows } });
  } catch (err) {
    logger.error('Leaderboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to get leaderboard' });
  }
};

/**
 * GET /api/users/:username/profile
 */
const getUserProfile = async (req, res) => {
  const { username } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.username, u.full_name, u.bio, u.avatar_url, u.role,
        u.department, u.designation, u.institution, u.website, u.github_url,
        u.linkedin_url, u.research_interests, u.reputation_score,
        u.question_count, u.answer_count, u.view_count, u.created_at, u.last_seen,
        (SELECT json_agg(
          json_build_object('id', b.id, 'name', b.name, 'icon', b.icon, 'badge_type', b.badge_type, 'awarded_at', ub.awarded_at)
          ORDER BY ub.awarded_at DESC
        ) FROM user_badges ub JOIN badges b ON ub.badge_id = b.id WHERE ub.user_id = u.id) as badges
      FROM users u
      WHERE u.username = $1 AND u.status != 'suspended'
    `, [username]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];

    // Get user's recent questions
    const questionsResult = await pool.query(`
      SELECT id, title, vote_score, answer_count, view_count, status, created_at
      FROM questions WHERE author_id = $1 AND status != 'deleted'
      ORDER BY created_at DESC LIMIT 10
    `, [user.id]);

    // Get user's top answers
    const answersResult = await pool.query(`
      SELECT a.id, a.vote_score, a.is_accepted, a.is_verified, a.created_at,
        q.id as question_id, q.title as question_title
      FROM answers a JOIN questions q ON a.question_id = q.id
      WHERE a.author_id = $1
      ORDER BY a.vote_score DESC LIMIT 10
    `, [user.id]);

    // Trust score calculation
    const trustScore = Math.min(100, Math.floor(
      (user.reputation_score * 0.3) +
      (user.answer_count * 2) +
      (user.question_count) +
      (parseInt(questionsResult.rows.filter(q => q.status === 'answered').length) * 5)
    ));

    res.json({
      success: true,
      data: {
        user: { ...user, trust_score: trustScore },
        recent_questions: questionsResult.rows,
        top_answers: answersResult.rows,
      },
    });
  } catch (err) {
    logger.error('User profile error:', err);
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
};

/**
 * PUT /api/users/profile
 */
const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const {
    full_name, bio, department, designation, website,
    github_url, linkedin_url, research_interests,
    notification_email, notification_app, theme_preference
  } = req.body;

  try {
    await pool.query(`
      UPDATE users SET
        full_name = COALESCE($1, full_name),
        bio = COALESCE($2, bio),
        department = COALESCE($3, department),
        designation = COALESCE($4, designation),
        website = COALESCE($5, website),
        github_url = COALESCE($6, github_url),
        linkedin_url = COALESCE($7, linkedin_url),
        research_interests = COALESCE($8, research_interests),
        notification_email = COALESCE($9, notification_email),
        notification_app = COALESCE($10, notification_app),
        theme_preference = COALESCE($11, theme_preference),
        updated_at = NOW()
      WHERE id = $12
    `, [full_name, bio, department, designation, website, github_url, linkedin_url,
        research_interests, notification_email, notification_app, theme_preference, userId]);

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    logger.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

/**
 * GET /api/users/notifications
 */
const getNotifications = async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, unread_only = false } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let whereExtra = unread_only === 'true' ? 'AND n.is_read = false' : '';
    const result = await pool.query(`
      SELECT n.*, 
        json_build_object('username', u.username, 'avatar_url', u.avatar_url) as sender
      FROM notifications n
      LEFT JOIN users u ON n.sender_id = u.id
      WHERE n.recipient_id = $1 ${whereExtra}
      ORDER BY n.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), offset]);

    const unreadCount = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE recipient_id=$1 AND is_read=false',
      [userId]
    );

    res.json({
      success: true,
      data: {
        notifications: result.rows,
        unread_count: parseInt(unreadCount.rows[0].count),
      },
    });
  } catch (err) {
    logger.error('Get notifications error:', err);
    res.status(500).json({ success: false, message: 'Failed to get notifications' });
  }
};

/**
 * PUT /api/users/notifications/read
 */
const markNotificationsRead = async (req, res) => {
  const userId = req.user.id;
  const { ids } = req.body; // array of notification IDs, or empty for all

  try {
    if (ids && ids.length > 0) {
      await pool.query(
        'UPDATE notifications SET is_read=true, read_at=NOW() WHERE id=ANY($1) AND recipient_id=$2',
        [ids, userId]
      );
    } else {
      await pool.query(
        'UPDATE notifications SET is_read=true, read_at=NOW() WHERE recipient_id=$1 AND is_read=false',
        [userId]
      );
    }
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    logger.error('Mark read error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark notifications' });
  }
};

/**
 * GET /api/users/bookmarks
 */
const getBookmarks = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(`
      SELECT q.id, q.title, q.vote_score, q.answer_count, q.status, q.created_at,
        b.created_at as bookmarked_at,
        json_build_object('name', c.name, 'slug', c.slug) as category
      FROM bookmarks b
      JOIN questions q ON b.question_id = q.id
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE b.user_id = $1 AND q.status != 'deleted'
      ORDER BY b.created_at DESC
    `, [userId]);

    res.json({ success: true, data: { bookmarks: result.rows } });
  } catch (err) {
    logger.error('Get bookmarks error:', err);
    res.status(500).json({ success: false, message: 'Failed to get bookmarks' });
  }
};

/**
 * GET /api/admin/users  (admin only)
 */
const adminGetUsers = async (req, res) => {
  const { page = 1, limit = 20, search, role, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let conditions = [];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(email ILIKE $${idx} OR username ILIKE $${idx} OR full_name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (role) { conditions.push(`role = $${idx++}`); params.push(role); }
    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [count, users] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users ${where}`, params),
      pool.query(`SELECT id, email, username, full_name, role, status, email_verified, reputation_score, question_count, answer_count, created_at, last_seen FROM users ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx+1}`, [...params, parseInt(limit), offset]),
    ]);

    res.json({
      success: true,
      data: {
        users: users.rows,
        pagination: { total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) },
      },
    });
  } catch (err) {
    logger.error('Admin get users error:', err);
    res.status(500).json({ success: false, message: 'Failed to get users' });
  }
};

/**
 * PUT /api/admin/users/:id/status  (admin only)
 */
const adminUpdateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status, role } = req.body;

  try {
    const updates = {};
    if (status) updates.status = status;
    if (role) updates.role = role;

    const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    await pool.query(`UPDATE users SET ${setClauses} WHERE id = $1`, [id, ...Object.values(updates)]);

    // Log admin action
    await pool.query(
      "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata) VALUES ($1,'admin_update_user','user',$2,$3)",
      [req.user.id, id, JSON.stringify(updates)]
    );

    res.json({ success: true, message: 'User updated' });
  } catch (err) {
    logger.error('Admin update user error:', err);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

module.exports = {
  getLeaderboard, getUserProfile, updateProfile,
  getNotifications, markNotificationsRead, getBookmarks,
  adminGetUsers, adminUpdateUserStatus
};
