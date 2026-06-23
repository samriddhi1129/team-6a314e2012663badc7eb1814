// backend/src/config/migrate.js
require('dotenv').config();
const { pool } = require('./database');
const logger = require('../utils/logger');

const schema = `
-- =============================================
-- VICHARANSHALA LAB FAQ PLATFORM - DATABASE SCHEMA
-- IIT Ropar | Production Schema v1.0
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =============================================
-- ENUMS
-- =============================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'researcher', 'faculty', 'admin', 'superadmin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE question_status AS ENUM ('open', 'answered', 'closed', 'deleted', 'flagged');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE vote_type AS ENUM ('upvote', 'downvote');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'new_answer', 'answer_accepted', 'question_upvoted', 'answer_upvoted',
    'mention', 'badge_earned', 'question_commented', 'answer_commented',
    'answer_verified', 'system'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE badge_type AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE report_reason AS ENUM (
    'spam', 'inappropriate', 'duplicate', 'misleading', 'harassment', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  username        VARCHAR(50) UNIQUE,
  password_hash   VARCHAR(255),
  full_name       VARCHAR(100) NOT NULL,
  avatar_url      TEXT,
  bio             TEXT,
  role            user_role DEFAULT 'student',
  status          user_status DEFAULT 'pending_verification',
  
  -- OAuth
  google_id       VARCHAR(255) UNIQUE,
  auth_provider   VARCHAR(50) DEFAULT 'local',
  
  -- Verification
  email_verified  BOOLEAN DEFAULT false,
  email_token     VARCHAR(255),
  email_token_expires TIMESTAMPTZ,
  
  -- Password Reset
  reset_token     VARCHAR(255),
  reset_token_expires TIMESTAMPTZ,
  
  -- Stats
  reputation_score INTEGER DEFAULT 0,
  question_count   INTEGER DEFAULT 0,
  answer_count     INTEGER DEFAULT 0,
  view_count       INTEGER DEFAULT 0,
  
  -- Profile
  department      VARCHAR(100),
  designation     VARCHAR(100),
  institution     VARCHAR(200) DEFAULT 'IIT Ropar',
  website         TEXT,
  github_url      TEXT,
  linkedin_url    TEXT,
  research_interests TEXT[],
  
  -- Settings
  notification_email BOOLEAN DEFAULT true,
  notification_app   BOOLEAN DEFAULT true,
  is_anonymous_default BOOLEAN DEFAULT false,
  theme_preference   VARCHAR(10) DEFAULT 'system',
  
  -- Timestamps
  last_seen       TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) UNIQUE NOT NULL,
  slug        VARCHAR(120) UNIQUE NOT NULL,
  description TEXT,
  icon        VARCHAR(50),
  color       VARCHAR(20),
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  question_count INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TAGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS tags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(50) UNIQUE NOT NULL,
  slug        VARCHAR(60) UNIQUE NOT NULL,
  description TEXT,
  color       VARCHAR(20) DEFAULT '#6366f1',
  usage_count INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- QUESTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  title           VARCHAR(500) NOT NULL,
  body            TEXT NOT NULL,
  body_text       TEXT, -- plain text for search
  status          question_status DEFAULT 'open',
  
  -- Anonymous posting
  is_anonymous    BOOLEAN DEFAULT false,
  
  -- Accepted answer
  accepted_answer_id UUID,
  
  -- Stats
  view_count      INTEGER DEFAULT 0,
  vote_score      INTEGER DEFAULT 0,
  answer_count    INTEGER DEFAULT 0,
  comment_count   INTEGER DEFAULT 0,
  
  -- Featured/Pinned
  is_featured     BOOLEAN DEFAULT false,
  is_pinned       BOOLEAN DEFAULT false,
  is_wiki         BOOLEAN DEFAULT false,
  
  -- Search vector
  search_vector   TSVECTOR,
  
  -- Metadata
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- QUESTION TAGS (many-to-many)
-- =============================================
CREATE TABLE IF NOT EXISTS question_tags (
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  tag_id      UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, tag_id)
);

-- =============================================
-- ANSWERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  body_text       TEXT,
  is_anonymous    BOOLEAN DEFAULT false,
  is_accepted     BOOLEAN DEFAULT false,
  is_wiki         BOOLEAN DEFAULT false,
  
  -- Verification (crowd validation)
  validation_count INTEGER DEFAULT 0,
  is_verified     BOOLEAN DEFAULT false,
  verified_at     TIMESTAMPTZ,
  verified_by     UUID REFERENCES users(id),
  
  -- Stats
  vote_score      INTEGER DEFAULT 0,
  comment_count   INTEGER DEFAULT 0,
  
  -- AI generated flag
  ai_assisted     BOOLEAN DEFAULT false,
  
  -- Search
  search_vector   TSVECTOR,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK for accepted_answer_id after answers table is created
ALTER TABLE questions 
  ADD CONSTRAINT fk_accepted_answer 
  FOREIGN KEY (accepted_answer_id) REFERENCES answers(id) ON DELETE SET NULL;

-- =============================================
-- ANSWER VALIDATIONS (crowd validation)
-- =============================================
CREATE TABLE IF NOT EXISTS answer_validations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  answer_id   UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (answer_id, user_id)
);

-- =============================================
-- COMMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  answer_id   UUID REFERENCES answers(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  vote_score  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT comment_has_parent CHECK (
    (question_id IS NOT NULL AND answer_id IS NULL) OR
    (question_id IS NULL AND answer_id IS NOT NULL)
  )
);

-- =============================================
-- VOTES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS votes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  answer_id   UUID REFERENCES answers(id) ON DELETE CASCADE,
  comment_id  UUID REFERENCES comments(id) ON DELETE CASCADE,
  vote_type   vote_type NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT vote_has_target CHECK (
    (question_id IS NOT NULL)::int + (answer_id IS NOT NULL)::int + (comment_id IS NOT NULL)::int = 1
  ),
  CONSTRAINT unique_question_vote UNIQUE (user_id, question_id),
  CONSTRAINT unique_answer_vote UNIQUE (user_id, answer_id),
  CONSTRAINT unique_comment_vote UNIQUE (user_id, comment_id)
);

-- =============================================
-- BADGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon        VARCHAR(50),
  badge_type  badge_type NOT NULL,
  criteria    JSONB,
  points_value INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER BADGES (earned badges)
-- =============================================
CREATE TABLE IF NOT EXISTS user_badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id    UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

-- =============================================
-- REPUTATION HISTORY
-- =============================================
CREATE TABLE IF NOT EXISTS reputation_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta       INTEGER NOT NULL,
  reason      VARCHAR(100) NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  answer_id   UUID REFERENCES answers(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  type            notification_type NOT NULL,
  title           VARCHAR(200) NOT NULL,
  message         TEXT NOT NULL,
  data            JSONB,
  is_read         BOOLEAN DEFAULT false,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- REPORTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS reports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  answer_id   UUID REFERENCES answers(id) ON DELETE CASCADE,
  comment_id  UUID REFERENCES comments(id) ON DELETE CASCADE,
  reason      report_reason NOT NULL,
  description TEXT,
  status      report_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  resolution  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FAQ ANALYTICS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS faq_analytics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id  VARCHAR(100),
  ip_address  INET,
  user_agent  TEXT,
  referrer    TEXT,
  time_spent  INTEGER, -- seconds
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ACTIVITY LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   UUID,
  metadata    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- QUESTION EDIT HISTORY (FAQ Evolution Timeline)
-- =============================================
CREATE TABLE IF NOT EXISTS question_revisions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  editor_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(500),
  body        TEXT,
  edit_comment VARCHAR(200),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS answer_revisions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  answer_id   UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  editor_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT,
  edit_comment VARCHAR(200),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SAVED/BOOKMARKED QUESTIONS
-- =============================================
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, question_id)
);

-- =============================================
-- FOLLOW QUESTIONS
-- =============================================
CREATE TABLE IF NOT EXISTS question_followers (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, question_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_reputation ON users(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Questions
CREATE INDEX IF NOT EXISTS idx_questions_author ON questions(author_id);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_created ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_activity ON questions(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_votes ON questions(vote_score DESC);
CREATE INDEX IF NOT EXISTS idx_questions_views ON questions(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_questions_featured ON questions(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_questions_search ON questions USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_questions_title_trgm ON questions USING GIN(title gin_trgm_ops);

-- Answers
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_author ON answers(author_id);
CREATE INDEX IF NOT EXISTS idx_answers_accepted ON answers(is_accepted) WHERE is_accepted = true;
CREATE INDEX IF NOT EXISTS idx_answers_verified ON answers(is_verified) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_answers_votes ON answers(vote_score DESC);

-- Votes
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_question ON votes(question_id);
CREATE INDEX IF NOT EXISTS idx_votes_answer ON votes(answer_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_analytics_question ON faq_analytics(question_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON faq_analytics(user_id);

-- Activity Logs
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_logs(entity_type, entity_id);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_answers_updated_at BEFORE UPDATE ON answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update question search vector
CREATE OR REPLACE FUNCTION update_question_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.body_text, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_question_search BEFORE INSERT OR UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_question_search_vector();

-- Auto verify answers with 5+ validations
CREATE OR REPLACE FUNCTION check_answer_verification()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE answers 
  SET is_verified = true, verified_at = NOW()
  WHERE id = NEW.answer_id 
    AND validation_count >= 5 
    AND is_verified = false;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_verification AFTER INSERT ON answer_validations
  FOR EACH ROW EXECUTE FUNCTION check_answer_verification();

-- Update answer count on question
CREATE OR REPLACE FUNCTION update_question_answer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE questions SET answer_count = answer_count + 1, last_activity_at = NOW()
    WHERE id = NEW.question_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE questions SET answer_count = answer_count - 1
    WHERE id = OLD.question_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_answer_count AFTER INSERT OR DELETE ON answers
  FOR EACH ROW EXECUTE FUNCTION update_question_answer_count();

-- Update category question count
CREATE OR REPLACE FUNCTION update_category_question_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.category_id IS NOT NULL THEN
    UPDATE categories SET question_count = question_count + 1 WHERE id = NEW.category_id;
  ELSIF TG_OP = 'DELETE' AND OLD.category_id IS NOT NULL THEN
    UPDATE categories SET question_count = question_count - 1 WHERE id = OLD.category_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.category_id IS NOT NULL THEN
      UPDATE categories SET question_count = question_count - 1 WHERE id = OLD.category_id;
    END IF;
    IF NEW.category_id IS NOT NULL THEN
      UPDATE categories SET question_count = question_count + 1 WHERE id = NEW.category_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cat_count AFTER INSERT OR UPDATE OR DELETE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_category_question_count();
`;

async function migrate() {
  const client = await pool.connect();
  try {
    logger.info('Starting database migration...');
    await client.query(schema);
    logger.info('Database migration completed successfully');
  } catch (err) {
    logger.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
