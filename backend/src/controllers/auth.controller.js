// backend/src/controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, generateEmailToken } = require('../utils/jwt');
const { sendEmail, emailTemplates } = require('../utils/email');
const logger = require('../utils/logger');

/**
 * POST /api/auth/register
 */
const register = async (req, res) => {
  const { email, password, full_name, username, role = 'student' } = req.body;

  try {
    // Check existing user
    const existing = await pool.query('SELECT id FROM users WHERE email=$1 OR username=$2', [email, username]);
    if (existing.rows.length) {
      return res.status(409).json({ success: false, message: 'Email or username already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    const emailToken = generateEmailToken();
    const emailTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (email, username, full_name, password_hash, role, email_token, email_token_expires)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, email, full_name, role, status`,
      [email, username, full_name, passwordHash, role, emailToken, emailTokenExpires]
    );

    const user = result.rows[0];

    // Send verification email (non-blocking)
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${emailToken}`;
    const template = emailTemplates.verification(full_name, verificationUrl);
    sendEmail({ to: email, ...template }).catch(err => logger.error('Verification email failed:', err));

    // Log activity
    await pool.query(
      "INSERT INTO activity_logs (user_id, action, entity_type, entity_id) VALUES ($1,'user_registered','user',$1)",
      [user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      data: { userId: user.id, email: user.email },
    });
  } catch (err) {
    logger.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email=$1',
      [email]
    );

    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({ success: false, message: 'Please use Google login for this account' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended' });
    }

    // Update last seen
    await pool.query('UPDATE users SET last_seen=NOW() WHERE id=$1', [user.id]);

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Log activity
    await pool.query(
      "INSERT INTO activity_logs (user_id, action, ip_address) VALUES ($1,'user_login',$2)",
      [user.id, req.ip]
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
          status: user.status,
          email_verified: user.email_verified,
          avatar_url: user.avatar_url,
          reputation_score: user.reputation_score,
        },
      },
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

/**
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const result = await pool.query('SELECT id, email, role, status FROM users WHERE id=$1', [decoded.userId]);
    if (!result.rows.length || result.rows[0].status === 'suspended') {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const user = result.rows[0];
    const newAccessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
    res.json({ success: true, data: { accessToken: newAccessToken } });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

/**
 * POST /api/auth/verify-email
 */
const verifyEmail = async (req, res) => {
  const { token } = req.body;

  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE email_token=$1 AND email_token_expires > NOW()',
      [token]
    );

    if (!result.rows.length) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    await pool.query(
      "UPDATE users SET email_verified=true, status='active', email_token=NULL, email_token_expires=NULL WHERE id=$1",
      [result.rows[0].id]
    );

    res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    logger.error('Email verification error:', err);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

/**
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const result = await pool.query('SELECT id, full_name FROM users WHERE email=$1', [email]);

    // Always return success to prevent email enumeration
    if (!result.rows.length) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const user = result.rows[0];
    const resetToken = generateEmailToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await pool.query(
      'UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3',
      [resetToken, resetExpires, user.id]
    );

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    const template = emailTemplates.passwordReset(user.full_name, resetUrl);
    await sendEmail({ to: email, ...template });

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    logger.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Failed to send reset email' });
  }
};

/**
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE reset_token=$1 AND reset_token_expires > NOW()',
      [token]
    );

    if (!result.rows.length) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE users SET password_hash=$1, reset_token=NULL, reset_token_expires=NULL WHERE id=$2',
      [passwordHash, result.rows[0].id]
    );

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    logger.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.*, 
        (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = u.id) as badge_count
       FROM users u WHERE u.id=$1`,
      [req.user.id]
    );

    const user = result.rows[0];
    delete user.password_hash;
    delete user.email_token;
    delete user.reset_token;

    res.json({ success: true, data: { user } });
  } catch (err) {
    logger.error('Get me error:', err);
    res.status(500).json({ success: false, message: 'Failed to get user' });
  }
};

/**
 * Google OAuth callback handler
 */
const googleCallback = async (profile) => {
  const { id, emails, displayName, photos } = profile;
  const email = emails[0]?.value;
  const avatarUrl = photos[0]?.value;

  // Check if user exists
  let result = await pool.query('SELECT * FROM users WHERE google_id=$1 OR email=$2', [id, email]);

  if (result.rows.length) {
    const user = result.rows[0];
    // Update Google info if needed
    if (!user.google_id) {
      await pool.query('UPDATE users SET google_id=$1, avatar_url=$2, auth_provider=$3, email_verified=true WHERE id=$4',
        [id, avatarUrl, 'google', user.id]);
    }
    await pool.query('UPDATE users SET last_seen=NOW() WHERE id=$1', [user.id]);
    return result.rows[0];
  }

  // Create new user
  const username = `user_${id.substring(0, 8)}`;
  result = await pool.query(
    `INSERT INTO users (email, username, full_name, google_id, avatar_url, auth_provider, email_verified, status, role)
     VALUES ($1,$2,$3,$4,$5,'google',true,'active','student') RETURNING *`,
    [email, username, displayName, id, avatarUrl]
  );

  return result.rows[0];
};

module.exports = { register, login, refreshToken, verifyEmail, forgotPassword, resetPassword, getMe, googleCallback };
