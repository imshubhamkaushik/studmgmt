# StudentHub — Student Management System

A school management web app: student records, classes, attendance, exams and report cards, assignments, announcements, and a self-service portal for students and guardians.

**Stack:** React + Vite (frontend) · Express (API) · MongoDB

## Features

**Staff app**
- **Students** – create, edit, archive/restore; immutable auto-generated Student IDs; statuses (`active`, `inactive`, `graduated`, `transferred`, `suspended`); search, filters, sorting, pagination; CSV export; CSV import (quick import with preview, and a background **Bulk Import** for large files with progress and a downloadable error report).
- **Academic structure** – academic years, classrooms (class + section, capacity), subjects, grading terms with weights.
- **Enrollment & promotion** – place students in classrooms per year with history; batch promotion that is validated before anything changes.
- **Attendance** – daily attendance per class/section, plus period-wise attendance driven by the timetable.
- **Exams & marks** – exams, mark entry, weighted subject grades, auto-generated report card PDFs (single or whole classroom as a ZIP).
- **Assignments** – teachers publish assignments with an optional attachment, record or review submissions, and grade them with feedback.
- **Announcements & notifications** – school-, classroom- or student-wide notices.
- **Users & roles** – admin, staff, teacher; teachers are assigned to classrooms and only see those.
- **Audit log** – who changed what and when, with filters.
- **Dashboard** – headline stats and recent activity.

**Student / guardian portal** (`/portal`)
Dashboard, attendance, assignments (submit work), report card, notifications and password change. Portal accounts are created automatically with each student:

| Account | Username | Default password |
|---|---|---|
| Student | Student ID (e.g. `STU-000009`) | Student ID + date of birth `YYYYMMDD` |
| Guardian | Student ID + `-parent` | Student ID + date of birth `YYYYMMDD` + `parent` |

Families should change the default password after first sign-in (the portal reminds them until they do).

## Roles

| Role | Can do |
|---|---|
| Admin | Everything, including users, academic structure, promotion, audit log |
| Staff | Students, enrollments, attendance, imports/exports |
| Teacher | Read access plus attendance, marks, assignments and grading for assigned classrooms only |

Accounts lock for 15 minutes after 5 failed sign-ins.

## Run locally

Requirements: **Node.js 20+** and **Docker** (for MongoDB only).

```bash
npm run install:all                 # install root, backend and frontend dependencies
npm run db:up                       # start MongoDB in Docker (docker-compose.yaml)
cp backend/.env.example backend/.env
npm run dev                         # start the API and the web app
```

Open **http://localhost:13000** and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `backend/.env` (the admin is created on first start).

Everything is served from **port 13000**. The dev server forwards `/api` to the API, which listens privately on `127.0.0.1:5000` and is not meant to be opened directly. Stop the database with `npm run db:down` (add `-v` to the compose command to wipe its data).

## Configuration (`backend/.env`)

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string (required) |
| `JWT_SECRET` | Signing secret, 32+ characters (required) |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First administrator, created on start-up |
| `JWT_ACCESS_TTL_SECONDS`, `JWT_REFRESH_TTL_DAYS` | Staff session lifetimes (defaults 900 s / 7 days) |
| `PORTAL_ACCESS_TTL_SECONDS`, `PORTAL_REFRESH_TTL_DAYS` | Portal session lifetimes |
| `PORT` | Private API port (default 5000) |
| `RATE_LIMIT_MAX` | Requests per minute per IP (default 120) |
| `CORS_ORIGINS` | Optional extra allowed origins; the app's own origin is always allowed |
| `REDIS_URL` | Optional shared rate-limit store when running several API instances |
| `TRUST_PROXY_HOPS` | Reverse proxies in front of the API (default 1) |

Change the sample `JWT_SECRET` and admin password for anything beyond your own machine.

## Where data lives

- **Records:** MongoDB.
- **Uploaded files** (assignment attachments, submissions, report card PDFs): `backend/uploads/`.
- **Sessions:** refresh tokens are stored hashed in MongoDB and sent as HttpOnly cookies.

## Deploying (single container stack)

`docker-compose.prod.yaml` runs MongoDB, the API and the web server. Only **port 13000** is published; nginx serves the app and forwards `/api` to the API.

```bash
cp .env.production.example .env     # replace every placeholder
docker compose -f docker-compose.prod.yaml up -d --build
```

Then open `http://<host>:13000`. Notes:
- Put HTTPS in front (load balancer or reverse proxy) — in production the refresh cookie is `Secure`, `HttpOnly` and `SameSite=Strict`. Set `TRUST_PROXY_HOPS=2` when a load balancer sits before the web container.
- MongoDB is not published outside the compose network.
- Health: `GET /api/v1/health` (liveness) and `GET /api/v1/ready` (MongoDB ready).

## Backup and restore

Requires MongoDB Database Tools (`mongodump`, `mongorestore`):

```bash
MONGODB_URI='mongodb://…' BACKUP_DIR=./backups ./ops/backup/backup-mongodb.sh
MONGODB_URI='mongodb://…' ./ops/backup/restore-mongodb.sh ./backups/<folder>/database.archive
```

Backups are compressed with a SHA-256 checksum; `BACKUP_RETENTION_DAYS` (default 14) prunes old local copies. Test restores against an isolated database, never production.

## API

Base path `/api/v1` (machine-readable spec at `/api/v1/openapi.json`). All business endpoints need a Bearer access token.

`auth` · `students` (incl. `import`, `export`, `import-jobs`) · `dashboard` · `audit` · `academic-years` · `classrooms` · `enrollments` · `teacher-classroom-assignments` · `subjects` · `grading-terms` · `exams` · `marks` · `timetable` · `attendance` · `period-attendance` · `assignments` · `assignment-submissions` · `notifications` · `report-cards` · `portal/*` (student/guardian)

## Project layout

```
backend/          Express API (controllers, services, models, routes, tests)
frontend-react/   React app (staff app + portal) and nginx config
shared/           Token and student-validation code used by the API
ops/backup/       MongoDB backup and restore scripts
docker-compose.yaml        MongoDB for local development
docker-compose.prod.yaml   Full stack for deployment
```

## Tests and checks

```bash
npm run test:backend                 # API unit tests
npm --prefix frontend-react test     # frontend tests
npm run lint
npm run build
```

Integration tests need an isolated, empty MongoDB database (they clear collections — never point them at real data):

```bash
export TEST_MONGODB_URI='mongodb://127.0.0.1:27017/studmgmt_test'
export JWT_SECRET='a-test-secret-longer-than-32-characters'
npm run test:integration
```

## Maintenance scripts

For databases created by older versions:

```bash
npm --prefix backend run migrate:student-ids -- --dry-run
npm --prefix backend run migrate:student-statuses -- --dry-run
npm --prefix backend run migrate:student-portal-credentials
```

Drop `--dry-run` to apply.
