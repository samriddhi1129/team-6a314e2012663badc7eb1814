// backend/src/config/seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./database');
const logger = require('../utils/logger');

const seedData = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ---- CATEGORIES ----
    const categories = [
      { name: 'Admissions', slug: 'admissions', description: 'Questions about admissions process, eligibility, and deadlines', icon: '🎓', color: '#6366f1' },
      { name: 'Research', slug: 'research', description: 'Research opportunities, projects, and publications', icon: '🔬', color: '#8b5cf6' },
      { name: 'Academics', slug: 'academics', description: 'Courses, curriculum, grading, and academic policies', icon: '📚', color: '#06b6d4' },
      { name: 'Campus Life', slug: 'campus-life', description: 'Hostels, facilities, clubs, and events', icon: '🏛️', color: '#10b981' },
      { name: 'Placements', slug: 'placements', description: 'Career guidance, placement stats, and industry connections', icon: '💼', color: '#f59e0b' },
      { name: 'Financial Aid', slug: 'financial-aid', description: 'Scholarships, fellowships, and fee structures', icon: '💰', color: '#ef4444' },
      { name: 'Faculty & Labs', slug: 'faculty-labs', description: 'Professor profiles, research labs, and collaborations', icon: '👨‍🔬', color: '#ec4899' },
      { name: 'Technology', slug: 'technology', description: 'IT infrastructure, software tools, and digital resources', icon: '💻', color: '#3b82f6' },
      { name: 'Internships', slug: 'internships', description: 'Industry internships, research internships, and stipends', icon: '🏢', color: '#84cc16' },
      { name: 'Alumni', slug: 'alumni', description: 'Alumni network, mentorship, and success stories', icon: '🤝', color: '#f97316' },
    ];

    for (const cat of categories) {
      await client.query(
        `INSERT INTO categories (name, slug, description, icon, color) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (slug) DO NOTHING`,
        [cat.name, cat.slug, cat.description, cat.icon, cat.color]
      );
    }

    // ---- TAGS ----
    const tags = [
      'phd', 'mtech', 'btech', 'cse', 'ece', 'mechanical', 'civil', 'chemistry',
      'mathematics', 'physics', 'ai-ml', 'data-science', 'robotics', 'iot',
      'hostel', 'mess', 'sports', 'cultural', 'gate', 'cat', 'iit-jee',
      'research-internship', 'industry-internship', 'stipend', 'placement',
      'scholarship', 'fellowship', 'trf', 'mhrd', 'thesis', 'publication',
      'conference', 'lab-access', 'hpc', 'cluster', 'library', 'sports-complex'
    ];

    for (const tag of tags) {
      await client.query(
        `INSERT INTO tags (name, slug) VALUES ($1,$2) ON CONFLICT (slug) DO NOTHING`,
        [tag, tag]
      );
    }

    // ---- BADGES ----
    const badges = [
      { name: 'First Question', description: 'Asked your first question', icon: '❓', type: 'bronze', points: 5 },
      { name: 'First Answer', description: 'Posted your first answer', icon: '💡', type: 'bronze', points: 5 },
      { name: 'Popular Question', description: 'Question received 10+ votes', icon: '🔥', type: 'silver', points: 25 },
      { name: 'Great Answer', description: 'Answer received 25+ votes', icon: '⭐', type: 'gold', points: 50 },
      { name: 'Scholar', description: 'Asked 100 questions', icon: '📖', type: 'silver', points: 30 },
      { name: 'Guru', description: 'Answered 100 questions', icon: '🧠', type: 'gold', points: 75 },
      { name: 'Enlightened', description: 'Answer accepted with 25+ votes', icon: '✨', type: 'platinum', points: 100 },
      { name: 'Legendary', description: '10,000+ reputation score', icon: '👑', type: 'diamond', points: 500 },
      { name: 'Curious Mind', description: 'Asked questions in 5 categories', icon: '🔭', type: 'bronze', points: 10 },
      { name: 'Community Pillar', description: '50+ answers validated by community', icon: '🏛️', type: 'gold', points: 100 },
      { name: 'Fact Checker', description: 'Validated 50+ community answers', icon: '✅', type: 'silver', points: 25 },
      { name: 'Mentor', description: 'Helped 100 unique users', icon: '🤝', type: 'platinum', points: 200 },
    ];

    for (const badge of badges) {
      await client.query(
        `INSERT INTO badges (name, description, icon, badge_type, points_value) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (name) DO NOTHING`,
        [badge.name, badge.description, badge.icon, badge.type, badge.points]
      );
    }

    // ---- ADMIN USER ----
    const adminHash = await bcrypt.hash('Admin@123!', 12);
    await client.query(
      `INSERT INTO users (email, username, full_name, password_hash, role, status, email_verified, department, designation)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (email) DO NOTHING`,
      ['admin@vicharanshala.iitropar.ac.in', 'admin', 'Lab Administrator', adminHash, 'admin', 'active', true, 'Computer Science', 'Lab Administrator']
    );

    // ---- DEMO USERS ----
    const demoUsers = [
      { email: 'priya.sharma@research.iitropar.ac.in', username: 'priya_sharma', name: 'Priya Sharma', dept: 'Computer Science & Engineering', designation: 'PhD Scholar', role: 'researcher' },
      { email: 'amit.kumar@btech.iitropar.ac.in', username: 'amit_kumar', name: 'Amit Kumar', dept: 'Electrical & Computer Engineering', designation: 'B.Tech Student', role: 'student' },
      { email: 'dr.mehta@iitropar.ac.in', username: 'dr_mehta', name: 'Dr. Rajesh Mehta', dept: 'Mathematics', designation: 'Associate Professor', role: 'faculty' },
      { email: 'sneha.patel@mtech.iitropar.ac.in', username: 'sneha_patel', name: 'Sneha Patel', dept: 'Mechanical Engineering', designation: 'M.Tech Student', role: 'student' },
      { email: 'rohan.verma@research.iitropar.ac.in', username: 'rohan_verma', name: 'Rohan Verma', dept: 'Data Science', designation: 'Research Scholar', role: 'researcher' },
    ];

    const userHash = await bcrypt.hash('Demo@1234', 12);
    for (const u of demoUsers) {
      await client.query(
        `INSERT INTO users (email, username, full_name, password_hash, role, status, email_verified, department, designation, reputation_score)
         VALUES ($1,$2,$3,$4,$5,'active',true,$6,$7,$8) ON CONFLICT (email) DO NOTHING`,
        [u.email, u.username, u.name, userHash, u.role, u.dept, u.designation, Math.floor(Math.random() * 500) + 50]
      );
    }

    // ---- SAMPLE QUESTIONS ----
    const adminResult = await client.query("SELECT id FROM users WHERE username='admin'");
    const adminId = adminResult.rows[0]?.id;

    const priyaResult = await client.query("SELECT id FROM users WHERE username='priya_sharma'");
    const priyaId = priyaResult.rows[0]?.id;

    const amitResult = await client.query("SELECT id FROM users WHERE username='amit_kumar'");
    const amitId = amitResult.rows[0]?.id;

    const admissionsResult = await client.query("SELECT id FROM categories WHERE slug='admissions'");
    const admissionsId = admissionsResult.rows[0]?.id;

    const researchResult = await client.query("SELECT id FROM categories WHERE slug='research'");
    const researchId = researchResult.rows[0]?.id;

    if (adminId && admissionsId) {
      const q1 = await client.query(
        `INSERT INTO questions (author_id, category_id, title, body, body_text, status, view_count, vote_score, answer_count)
         VALUES ($1,$2,$3,$4,$5,'open',245,18,3) RETURNING id`,
        [
          amitId || adminId, admissionsId,
          'What is the admission process for PhD program at IIT Ropar?',
          '<p>I am interested in pursuing a PhD in Computer Science at IIT Ropar. Could someone explain the complete admission process, including eligibility criteria, entrance tests, interview rounds, and important deadlines?</p><p>Specifically, I want to know:</p><ul><li>GATE score requirements</li><li>Interview format and preparation tips</li><li>Fellowship/stipend details</li><li>Research areas available</li></ul>',
          'I am interested in pursuing a PhD in Computer Science at IIT Ropar admission process eligibility criteria entrance tests interview rounds important deadlines GATE score requirements fellowship stipend research areas',
        ]
      );

      await client.query(
        `INSERT INTO answers (question_id, author_id, body, body_text, is_accepted, vote_score, is_verified, validation_count)
         VALUES ($1,$2,$3,$4,true,24,true,7)`,
        [
          q1.rows[0].id, priyaId || adminId,
          '<p>The PhD admission process at IIT Ropar happens twice a year (January and July semesters). Here is a comprehensive breakdown:</p><h3>Eligibility</h3><ul><li>M.Tech/M.E. in relevant field with 60% marks (or CGPA 6.0/10)</li><li>B.Tech with valid GATE score (70+ percentile recommended)</li></ul><h3>Process</h3><ol><li>Online application through the IIT Ropar website</li><li>Shortlisting based on GATE score + academic record</li><li>Written test (some departments)</li><li>Personal interview with potential supervisor</li></ol><h3>Fellowship</h3><p>All admitted PhD scholars receive MHRD fellowship of ₹31,000/month (pre-comprehensive) and ₹35,000/month (post-comprehensive).</p>',
          'PhD admission process IIT Ropar twice a year January July semesters eligibility MTech BTech GATE score fellowship MHRD 31000 35000 per month'
        ]
      );
    }

    if (priyaId && researchId) {
      await client.query(
        `INSERT INTO questions (author_id, category_id, title, body, body_text, status, view_count, vote_score, answer_count)
         VALUES ($1,$2,$3,$4,$5,'answered',189,15,2)`,
        [
          priyaId, researchId,
          'How to apply for research internships at IIT Ropar labs?',
          '<p>I am a final year B.Tech student looking for research internship opportunities at IIT Ropar. What is the process to reach out to professors and get internship opportunities? Are there any formal programs?</p>',
          'research internship IIT Ropar labs professor outreach formal programs B.Tech student final year'
        ]
      );
    }

    await client.query('COMMIT');
    logger.info('Seed data inserted successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Seeding failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

seedData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
