# Smart Queue Management System

A real-time digital queue management system for hospitals, clinics, colleges, banks, and service centers.

## Architecture

```
React + Tailwind
       |
  REST + Socket.IO
       |
       v
  Node.js + Express
    /      |       \
   /       |        \
  v        v         v
Supabase PostgreSQL Redis   Python FastAPI
      |             |            |
      |             |       Scikit-learn
      |             |       Pandas
      |             |       NumPy
      |             |
      |        Live Queue State
      |
      v
 Supabase Storage
 Photos/Documents
```

## Technology Stack

- **Frontend:** React.js, Tailwind CSS, Socket.IO Client
- **Backend:** Node.js, Express.js, Socket.IO
- **Database:** Supabase PostgreSQL
- **Storage:** Supabase Storage
- **Cache:** Redis
- **ML Service:** Python, FastAPI, Scikit-learn, Pandas, NumPy
- **Authentication:** JWT, RBAC, bcrypt
- **Email:** SMTP (Nodemailer)
- **Containerization:** Docker, Docker Compose

## Project Structure

```
smart-queue-management/
├── frontend/          # React + Tailwind
├── backend/           # Node.js + Express
├── ml-service/        # Python FastAPI
├── database/          # SQL migrations
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Get your project URL and service role key
3. Run the migration SQL in the Supabase SQL editor:
   - Go to SQL Editor
   - Paste contents of `database/migrations/001_initial_schema.sql`
   - Execute

4. Create Storage buckets:
   - Go to Storage
   - Create bucket: `profile-photos` (private)
   - Create bucket: `queue-documents` (private)

## Environment Variables

### Backend (.env)

```bash
cp backend/.env.example backend/.env
```

Fill in:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection URL
- `JWT_SECRET` - Random secret for JWT
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` - Email config
- `ML_SERVICE_URL` - http://ml-service:8000

### Frontend (.env)

```bash
cp frontend/.env.example frontend/.env
```

### ML Service (.env)

```bash
cp ml-service/.env.example ml-service/.env
```

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.11+
- Redis

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

### ML Service

```bash
cd ml-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Docker Setup

```bash
docker-compose up --build
```

Services:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- ML Service: http://localhost:8000
- Redis: localhost:6379

## API Documentation

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/register-admin | Register admin |
| POST | /api/auth/verify-otp | Verify email OTP |
| POST | /api/auth/resend-otp | Resend OTP |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Get current user |

### Queues

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/queues | Create queue (Admin) |
| GET | /api/queues/admin | Get admin queues |
| GET | /api/queues/:publicCode | Get queue by code |
| GET | /api/queues/:queueId/types | Get queue with types |
| POST | /api/queues/join/:publicCode | Join queue |
| POST | /api/queues/admin-access | Admin access by code |
| POST | /api/queues/:queueTypeId/members/:memberId/serve | Serve token |
| POST | /api/queues/:queueTypeId/members/:memberId/complete | Complete token |
| POST | /api/queues/:queueTypeId/members/:memberId/skip | Skip token |
| POST | /api/queues/:queueTypeId/members/:memberId/remove | Remove token |
| POST | /api/queues/member/:memberId/leave | Leave queue |
| POST | /api/queues/:queueId/break | Start break |
| POST | /api/queues/:queueId/resume | End break |
| POST | /api/queues/:queueId/end | End queue |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/documents/:queueId/requirements | Add requirement |
| GET | /api/documents/:queueId/requirements | Get requirements |
| PUT | /api/documents/requirements/:id | Update requirement |
| DELETE | /api/documents/requirements/:id | Delete requirement |
| POST | /api/documents/:memberId/documents/:reqId | Upload document |
| POST | /api/documents/documents/:id/verify | Verify document |

### Eligibility

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/eligibility/:queueId/upload | Upload Excel/CSV |
| POST | /api/eligibility/:queueId/check | Check eligibility |
| GET | /api/eligibility/:queueId/records | Get records |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/:queueTypeId | Queue analytics |
| GET | /api/analytics/:queueTypeId/hourly | Hourly stats |
| GET | /api/analytics/queue/:queueId/daily | Daily stats |

### Predictions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/predictions/:queueTypeId | Get wait time prediction |

## Socket.IO Events

### Client Events (emit)

| Event | Data | Description |
|-------|------|-------------|
| join:queue | queueId | Join queue room |
| leave:queue | queueId | Leave queue room |

### Server Events (listen)

| Event | Data | Description |
|-------|------|-------------|
| token:generated | { member, queueType } | New token created |
| token:called | { member } | Token being served |
| token:completed | { member } | Token completed |
| token:skipped | { member } | Token skipped |
| token:removed | { member } | Token removed |
| queue:breakStarted | { break } | Break started |
| queue:breakEnded | - | Break ended |
| queue:closed | - | Queue closed |

## Testing

```bash
cd backend
npm test
```

## Key Features

- **Concurrency-safe token generation** - Handles 100+ simultaneous requests
- **Real-time updates** via Socket.IO
- **QR code generation** for easy queue joining
- **Document verification** with OCR support
- **Excel/CSV eligibility checking**
- **ML-powered wait time prediction**
- **Admin analytics dashboard**
- **Mobile-responsive UI**
- **JWT authentication with RBAC**
- **Redis for live queue state**
- **PostgreSQL for permanent data**
- **Docker containerization**

## License

MIT
