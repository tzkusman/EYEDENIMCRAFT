# EYE – Production Monitoring System (Denim Crafts)
## Complete Deployment & Operations Manual

EYE is a production-grade, date-wise garment monitoring web platform engineered for **Denim Crafts** in Karachi, Pakistan. It replaces paper diary tracking with an immutable Delivery Challan (DC) digital ledger, running balance calculations, zero-balance auto-closure, and production delay alerting across stitching lines and wash transfers.

---

### 1. Setting up Supabase Database & Auth

1. Log in to [Supabase](https://supabase.com) and click **New Project**.
2. Name the project `denimcrafts-eye`, choose your secure database password, and select the region closest to Karachi (`Singapore` or `Frankfurt` for lowest latency).
3. Under **Project Settings -> Database**:
   - Locate the **Connection String** section and toggle **Connection Pooling** (PgBouncer mode: `Transaction`).
   - Copy the Pooled URL (port 6543):
     ```
     DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
     ```
   - Copy the Direct URL (port 5432) used for running schema migrations:
     ```
     DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
     ```
4. Under **Project Settings -> API**:
   - Copy `Project URL` (`SUPABASE_URL`)
   - Copy `anon public` key (`SUPABASE_ANON_KEY`)
   - Copy `service_role secret` key (`SUPABASE_SERVICE_ROLE_KEY` - kept strictly on the backend!)

---

### 2. Environment Configuration

Create `.env` inside `/server` (or in project root):

```env
# Database Connections
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Supabase Auth & JWT
SUPABASE_URL="https://[REF].supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Server Settings
PORT=4000
NODE_ENV=production
CORS_ORIGIN="https://eye.denimcrafts.com,http://localhost:3000"

# Initial Factory Admin Seed Credentials
FIRST_ADMIN_EMAIL="admin@denimcrafts.com"
FIRST_ADMIN_NAME="Usman Tariq"
FIRST_ADMIN_PASSWORD="SecureKarachiPassword2026!"
```

---

### 3. Database Migrations & Initial Seed

From the `/server` directory:

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Apply migrations to Supabase PostgreSQL
npx prisma migrate deploy

# 4. Apply PostgreSQL Immutability Trigger Guard (strictly blocks dcNo alterations)
npx prisma db execute --file ./prisma/migrations/trigger_immutable_dcno.sql

# 5. Seed the initial Admin and sample stitching line DCs
npm run prisma:seed
```

---

### 4. Running Locally

#### Option A: Direct Node runtime
```bash
npm run dev
# Server listening on http://localhost:4000
# Health check: http://localhost:4000/health
```

#### Option B: Docker Compose
```bash
docker-compose up --build -d
```

---

### 5. Cloud Deployment Guides

#### Deploying Backend API to Render / Railway
1. **Repository**: Link your GitHub repository.
2. **Root Directory**: Set to `server`.
3. **Build Command**: `npm ci && npm run build`
4. **Start Command**: `npm start`
5. **Environment Variables**: Add `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN`, `PORT=4000`.
6. **Health Check Path**: `/health`

#### Deploying Frontend to Vercel
1. Link the root project to Vercel.
2. Set Framework Preset: `Next.js`.
3. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-api.onrender.com/api/v1`.
4. Deploy!

---

### 6. Database Backups & Disaster Recovery

1. **Supabase Automated Daily Backups**: Enabled automatically on Pro projects under **Database -> Backups**.
2. **Manual & Scheduled pg_dump Script**:
   Run the provided backup script:
   ```bash
   chmod +x ./backup-supabase.sh
   ./backup-supabase.sh
   ```
   Can be scheduled via crontab:
   ```cron
   0 2 * * * cd /opt/eye-server && ./backup-supabase.sh >> /var/log/eye-backup.log 2>&1
   ```
   Maintains a rolling 30-day encrypted/gzip archive in `./backups`.
