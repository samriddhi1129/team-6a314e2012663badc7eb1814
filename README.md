# 🎓 Vicharanshala Lab — FAQ Crowdsourcing Platform
### IIT Ropar Community Knowledge Base

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A production-ready, community-driven FAQ platform built for IIT Ropar — where students, researchers, faculty and visitors can ask questions, share knowledge, and build a living knowledge base together.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔐 **Auth** | JWT + Google OAuth, email verification, password reset |
| ❓ **Questions** | Rich editor, categories, tags, anonymous posting, edit history |
| 💬 **Answers** | Multiple answers, accepted answer, anonymous, AI-assisted flag |
| 🗳️ **Voting** | Upvote/downvote questions & answers, reputation system |
| 🤖 **AI Assistant** | Claude-powered chatbot trained on IIT Ropar knowledge |
| 🔍 **Smart Search** | Full-text + trigram search, similar question detection |
| ✅ **Crowd Validation** | Answers become "Verified" after 5 community validations |
| 📝 **Wiki Mode** | Community can collaboratively edit verified FAQs |
| 🏆 **Gamification** | Badges, reputation, trust score, leaderboard |
| 📊 **Analytics** | Activity timeline, FAQ heatmap, knowledge graph, research map |
| 🛡️ **Admin Panel** | User management, content moderation, reports |
| 🔔 **Notifications** | In-app + email notifications for answers, mentions, badges |
| 🌓 **Dark/Light Mode** | Glassmorphism UI with IIT Ropar color palette |
| 📱 **Responsive** | Mobile-first, works on all devices |
| 🐳 **Docker** | One-command deployment |

---

## 🏗️ Tech Stack

### Frontend
- **React 18** + **Vite** — fast development
- **Tailwind CSS** — utility-first styling
- **Framer Motion** — smooth animations
- **TanStack Query** — server state management
- **Zustand** — client state
- **Recharts** + **D3** — data visualizations
- **Axios** — HTTP client with interceptors

### Backend
- **Node.js 20** + **Express.js**
- **PostgreSQL 15** — primary database
- **JWT** — stateless authentication
- **Passport.js** — OAuth strategy
- **Nodemailer** — transactional email
- **Winston** — structured logging
- **Helmet** + **express-rate-limit** — security

---

##  Project Structure

```
vicharanshala/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js        # PostgreSQL pool
│   │   │   ├── migrate.js         # Schema migration
│   │   │   └── seed.js            # Seed data
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── questions.controller.js
│   │   │   ├── answers.controller.js
│   │   │   ├── users.controller.js
│   │   │   ├── categories.controller.js
│   │   │   └── analytics.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT middleware
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   └── index.js           # All API routes
│   │   ├── utils/
│   │   │   ├── logger.js          # Winston logger
│   │   │   ├── jwt.js             # Token utilities
│   │   │   └── email.js           # Email templates
│   │   └── server.js              # Express app entry
│   ├── logs/                      # Runtime logs
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── common/
│   │   │       └── MainLayout.jsx # Nav + sidebar
│   │   ├── hooks/
│   │   │   └── useDebounce.js
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── ExplorePage.jsx
│   │   │   ├── QuestionDetail.jsx
│   │   │   ├── AskQuestion.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── LeaderboardPage.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   ├── AIAssistantPage.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── ResetPassword.jsx
│   │   │   ├── VerifyEmail.jsx
│   │   │   └── NotFoundPage.jsx
│   │   ├── services/
│   │   │   └── api.js             # Axios + service objects
│   │   ├── store/
│   │   │   └── authStore.js       # Zustand auth store
│   │   ├── styles/
│   │   │   └── globals.css        # Tailwind + custom CSS
│   │   ├── App.jsx                # Router
│   │   └── main.jsx               # Entry point
│   ├── Dockerfile
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── docker/
│   └── nginx.conf                 # Production Nginx config
├── docs/
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

##  Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm / yarn

### 1. Clone & Install

```bash
git clone https://github.com/vicharanashala/team-6a314e2012663badc7eb1814.git
cd team-6a314e2012663badc7eb1814
npm run install:all
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials, JWT secret, etc.

# Frontend (optional — defaults to /api proxy)
# VITE_API_URL is set to /api by default via Vite proxy
```

**Required backend `.env` values:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vicharanshala_db
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_super_secret_min_32_chars_here
JWT_REFRESH_SECRET=another_secret_here

CLIENT_URL=http://localhost:5173
```

### 3. Set Up Database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE vicharanshala_db;"

# Run migrations (creates all tables, indexes, triggers)
cd backend && npm run db:migrate

# Seed with demo data
npm run db:seed
```

### 4. Start Development

```bash
# From root — starts both backend (port 5000) and frontend (port 5173)
npm run dev
```

Open **http://localhost:5173**

**Demo Accounts:**
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@vicharanshala.iitropar.ac.in` | `Admin@123!` |
| Researcher | `priya.sharma@research.iitropar.ac.in` | `Demo@1234` |
| Student | `amit.kumar@btech.iitropar.ac.in` | `Demo@1234` |

---

## 🐳 Docker Deployment

### One-command start

```bash
# Copy and configure environment (backend .env)
cp backend/.env.example backend/.env
# Edit backend/.env with production values

# Start all services
docker-compose up -d

# Run migrations + seed
docker exec vicharanshala_api node src/config/migrate.js
docker exec vicharanshala_api node src/config/seed.js
```

Services:
- **Frontend** → http://localhost (port 80)
- **Backend API** → http://localhost:5000
- **PostgreSQL** → localhost:5432

### Stop
```bash
docker-compose down
# Add -v to also remove database volume
```

---

## 🔌 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/verify-email` | Verify email address |
| POST | `/api/auth/forgot-password` | Send reset email |
| POST | `/api/auth/reset-password` | Reset password |
| GET  | `/api/auth/me` | Get current user |

### Questions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/questions` | List questions (search, filter, paginate) |
| POST | `/api/questions` | Create question |
| GET | `/api/questions/:id` | Get question detail |
| PUT | `/api/questions/:id` | Update question |
| DELETE | `/api/questions/:id` | Delete question |
| POST | `/api/questions/:id/vote` | Vote on question |
| POST | `/api/questions/:id/bookmark` | Bookmark question |
| GET | `/api/questions/trending` | Trending questions |
| GET | `/api/questions/search/similar` | Similar question detection |

### Answers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/questions/:id/answers` | Get answers for question |
| POST | `/api/questions/:id/answers` | Post answer |
| PUT | `/api/answers/:id` | Edit answer |
| DELETE | `/api/answers/:id` | Delete answer |
| POST | `/api/answers/:id/accept` | Accept/unaccept answer |
| POST | `/api/answers/:id/vote` | Vote on answer |
| POST | `/api/answers/:id/validate` | Community validate answer |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Platform statistics |
| GET | `/api/analytics/heatmap` | Category heatmap data |
| GET | `/api/analytics/activity` | Daily activity timeline |
| GET | `/api/analytics/knowledge-graph` | Tag relationship graph |
| GET | `/api/analytics/research-map` | Research topics map |

---

## 🗄️ Database Schema

### Core Tables
- **users** — profiles, auth, reputation, settings
- **questions** — title, body, status, votes, search vector
- **answers** — body, validation, wiki mode
- **votes** — polymorphic votes on questions/answers/comments
- **comments** — threaded comments on questions and answers
- **categories** — hierarchical FAQ categories
- **tags** — folksonomy tagging with usage counts
- **badges** — achievement definitions (bronze→diamond)
- **user_badges** — earned badges
- **notifications** — in-app notification queue
- **reputation_history** — audit trail for reputation changes
- **reports** — user-flagged content
- **faq_analytics** — page view tracking
- **activity_logs** — audit log
- **question_revisions** — edit history (FAQ Evolution Timeline)
- **answer_revisions** — answer edit history
- **answer_validations** — crowd validation tracking
- **bookmarks** — saved questions
- **question_followers** — question subscriptions

### Key PostgreSQL Features Used
- **Full-text search** (`tsvector` / `tsquery`) with GIN indexes
- **Trigram matching** (`pg_trgm`) for fuzzy search
- **UUID** primary keys throughout
- **Triggers** for auto-updating counts, timestamps, search vectors
- **Check constraints** for data integrity
- **Enums** for typed status fields

---

## 🎨 UI Design System

### Color Palette (IIT Ropar Inspired)
- **Primary** — Indigo (`#6366f1`) — knowledge and trust
- **Navy** — `#0f2244` — IIT Ropar deep blue
- **Gold** — `#f59e0b` — achievement and excellence
- **Teal** — `#0891b2` — innovation
- **Glassmorphism** — `backdrop-blur` + semi-transparent backgrounds

### Design Principles
1. **Glassmorphism** — frosted glass cards with subtle borders
2. **Dark-first** — dark mode default, light mode available
3. **Micro-animations** — Framer Motion for all transitions
4. **Responsive** — mobile-first breakpoints
5. **Accessibility** — semantic HTML, ARIA labels, keyboard navigation

---

## 🔒 Security Features

- **JWT** with short-lived access tokens (7d) + refresh tokens (30d)
- **bcrypt** password hashing (12 rounds)
- **Helmet.js** HTTP security headers
- **CORS** configured with allowlist
- **Rate limiting** — 100 req/15min globally, 10 req/15min for auth
- **Input validation** on all endpoints
- **SQL injection prevention** — parameterized queries throughout
- **XSS prevention** — HTML sanitization in rich text
- **Email enumeration prevention** — uniform responses
- **Non-root Docker** — runs as unprivileged user

---

## 🚢 Production Deployment Guide

### Environment Variables (Production)
```env
NODE_ENV=production
JWT_SECRET=<64+ character random string>
JWT_REFRESH_SECRET=<64+ character random string>
DB_PASSWORD=<strong password>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
SMTP_HOST=smtp.gmail.com
SMTP_USER=your@gmail.com
SMTP_PASS=<app-specific password>
ANTHROPIC_API_KEY=<from console.anthropic.com>
CLIENT_URL=https://vicharanshala.iitropar.ac.in
```

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Configure the OAuth consent screen and create OAuth 2.0 credentials (do not rely on the deprecated Google+ API). Optionally enable the People API if you need profile scopes.
4. Add authorized redirect URIs: `https://yourdomain.com/api/auth/google/callback`

### SSL/TLS (Let's Encrypt)
```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d vicharanshala.iitropar.ac.in
```

### Database Backup
```bash
# Backup
pg_dump -U postgres vicharanshala_db > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres vicharanshala_db < backup_20240101.sql
```

---

## 🛠️ Development Guide

### Adding a New API Endpoint
1. Add controller function in `backend/src/controllers/`
2. Register route in `backend/src/routes/index.js`
3. Add corresponding service call in `frontend/src/services/api.js`
4. Create/update React component to use it

### Running Database Migrations
```bash
# After schema changes, update migrate.js and run:
cd backend && npm run db:migrate
```

### Environment Variables Reference
See `backend/.env.example` for all available configuration options.

---

## 📈 Roadmap

- [ ] WebSocket real-time notifications
- [ ] Advanced AI answer generation (Claude API integration)
- [ ] Mobile apps (React Native)
- [ ] LaTeX math rendering support
- [ ] Code syntax highlighting in answers
- [ ] File attachments for questions
- [ ] Multi-language support (Hindi)
- [ ] Calendar integration for academic events
- [ ] Integration with IIT Ropar SSO

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🏛️ About

**Vicharanshala Lab** (विचारणशाला — "Place of Inquiry") is the official FAQ platform of IIT Ropar, built to democratize academic knowledge and help every member of the IIT Ropar community find answers faster.

Built with ❤️ for the IIT Ropar community.

---


# team-6a314e2012663badc7eb1814
FAQ Crowdsourcing project — Samriddhi Bansal
