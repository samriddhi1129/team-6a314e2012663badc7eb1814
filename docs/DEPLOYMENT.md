# 🚀 Deployment Guide — Vicharanshala Lab

## Table of Contents
1. [Quick Docker Deploy](#docker)
2. [Manual VPS Deploy (Ubuntu)](#vps)
3. [Environment Variables Reference](#env)
4. [SSL Setup](#ssl)
5. [Monitoring & Logs](#monitoring)
6. [Scaling](#scaling)

---

## 1. Docker Deployment (Recommended) {#docker}

### Prerequisites
- Docker Engine 24+
- Docker Compose v2+
- 2GB+ RAM, 20GB+ disk

### Steps

```bash
# 1. Clone repository
git clone https://github.com/your-org/vicharanshala-lab.git
cd vicharanshala-lab

# 2. Configure environment
cat > .env << 'EOF'
DB_PASSWORD=YourStrongPassword123!
JWT_SECRET=your_64_char_random_secret_here_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
JWT_REFRESH_SECRET=another_64_char_secret_here_yyyyyyyyyyyyyyyyyyyyyyyyyy
CLIENT_URL=https://vicharanshala.iitropar.ac.in
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=vicharanshala@iitropar.ac.in
SMTP_PASS=your_app_password
ANTHROPIC_API_KEY=sk-ant-xxxxx
EOF

# 3. Build and start all services
docker-compose up -d --build

# 4. Wait for database to be ready (≈10s), then migrate + seed
sleep 15
docker exec vicharanshala_api node src/config/migrate.js
docker exec vicharanshala_api node src/config/seed.js

# 5. Verify everything is healthy
docker-compose ps
curl http://localhost:5000/health
```

**Access:**
- Web App: http://localhost (or your domain)
- API: http://localhost:5000/api
- Health: http://localhost:5000/health

### Update Deployment

```bash
git pull origin main
docker-compose down
docker-compose up -d --build
```

---

## 2. Manual VPS Deployment (Ubuntu 22.04) {#vps}

### Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib

# Nginx
sudo apt install -y nginx

# PM2 (process manager)
sudo npm install -g pm2
```

### Database Setup

```bash
sudo -u postgres psql << 'SQL'
CREATE DATABASE vicharanshala_db;
CREATE USER vicharanshala_user WITH ENCRYPTED PASSWORD 'YourStrongPassword123!';
GRANT ALL PRIVILEGES ON DATABASE vicharanshala_db TO vicharanshala_user;
ALTER DATABASE vicharanshala_db OWNER TO vicharanshala_user;
SQL
```

### Backend Setup

```bash
cd /opt/vicharanshala/backend
cp .env.example .env
# Edit .env with production values
nano .env

npm install --production
node src/config/migrate.js
node src/config/seed.js

# Start with PM2
pm2 start src/server.js --name vicharanshala-api
pm2 startup
pm2 save
```

### Frontend Build

```bash
cd /opt/vicharanshala/frontend
npm install
npm run build
# dist/ is now ready to serve
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/vicharanshala
server {
    listen 80;
    server_name vicharanshala.iitropar.ac.in;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name vicharanshala.iitropar.ac.in;

    ssl_certificate     /etc/letsencrypt/live/vicharanshala.iitropar.ac.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vicharanshala.iitropar.ac.in/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    root /opt/vicharanshala/frontend/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/vicharanshala /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 3. Environment Variables Reference {#env}

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | ✅ | `production` or `development` |
| `PORT` | ✅ | API server port (default: 5000) |
| `DB_HOST` | ✅ | PostgreSQL host |
| `DB_PORT` | ✅ | PostgreSQL port (default: 5432) |
| `DB_NAME` | ✅ | Database name |
| `DB_USER` | ✅ | Database user |
| `DB_PASSWORD` | ✅ | Database password |
| `JWT_SECRET` | ✅ | Min 32 chars, use random string |
| `JWT_REFRESH_SECRET` | ✅ | Different from JWT_SECRET |
| `JWT_EXPIRES_IN` | — | Default: `7d` |
| `JWT_REFRESH_EXPIRES_IN` | — | Default: `30d` |
| `CLIENT_URL` | ✅ | Frontend URL (for CORS + email links) |
| `GOOGLE_CLIENT_ID` | — | For Google OAuth |
| `GOOGLE_CLIENT_SECRET` | — | For Google OAuth |
| `GOOGLE_CALLBACK_URL` | — | `/api/auth/google/callback` |
| `SMTP_HOST` | — | Email server host |
| `SMTP_PORT` | — | Email server port |
| `SMTP_USER` | — | Email login |
| `SMTP_PASS` | — | Email password / app password |
| `EMAIL_FROM` | — | Sender display name + address |
| `ANTHROPIC_API_KEY` | — | For AI assistant features |
| `RATE_LIMIT_WINDOW_MS` | — | Default: 900000 (15min) |
| `RATE_LIMIT_MAX` | — | Default: 100 req/window |

---

## 4. SSL Setup (Let's Encrypt) {#ssl}

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d vicharanshala.iitropar.ac.in

# Auto-renewal (already configured by certbot)
sudo systemctl status certbot.timer
```

---

## 5. Monitoring & Logs {#monitoring}

### PM2 Monitoring
```bash
pm2 status           # Service status
pm2 logs             # Live logs
pm2 monit            # Resource monitor
pm2 restart all      # Restart all
```

### Application Logs
```bash
# Backend logs
tail -f /opt/vicharanshala/backend/logs/combined.log
tail -f /opt/vicharanshala/backend/logs/error.log

# Docker logs
docker-compose logs -f backend
docker-compose logs -f postgres
```

### Database Backup
```bash
# Daily backup script
cat > /etc/cron.daily/vicharanshala-backup << 'EOF'
#!/bin/bash
BACKUP_DIR=/backups/vicharanshala
mkdir -p $BACKUP_DIR
pg_dump -U postgres vicharanshala_db | gzip > "$BACKUP_DIR/db_$(date +%Y%m%d_%H%M).sql.gz"
# Keep 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
EOF
chmod +x /etc/cron.daily/vicharanshala-backup
```

---

## 6. Scaling {#scaling}

For high traffic, consider:

1. **Read replicas** — PostgreSQL streaming replication for read scaling
2. **Redis** — Cache hot questions, rate limiting, session storage
3. **CDN** — CloudFront/Cloudflare for static assets
4. **Horizontal scaling** — Multiple backend instances behind a load balancer
5. **Connection pooling** — PgBouncer for database connection management

### Minimal Production Checklist

- [ ] Strong JWT secrets (64+ random chars)
- [ ] PostgreSQL password changed from default
- [ ] SSL/TLS certificate installed
- [ ] Firewall configured (only 80, 443 exposed)
- [ ] Automatic database backups scheduled
- [ ] Log rotation configured
- [ ] Email (SMTP) configured and tested
- [ ] Google OAuth credentials configured
- [ ] Rate limiting tuned for expected traffic
- [ ] Admin account password changed from seed default
