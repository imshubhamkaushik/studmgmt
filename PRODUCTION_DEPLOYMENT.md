# Production deployment and operations

## Before deployment

1. Use a managed secret store or deployment secret mechanism; never commit `.env` files.
2. Set a random `JWT_SECRET` of at least 32 characters.
3. Set an exact HTTPS frontend origin in `CORS_ORIGINS`.
4. Use HTTPS at a reverse proxy/load balancer. The backend trusts one proxy hop.
5. Put MongoDB on a private network. The Compose file does not publish MongoDB ports.
6. Replace the in-memory rate limiter with a shared store before horizontally scaling backend replicas.

## Compose startup

Copy `.env.production.example` to `.env`, replace every placeholder, then run:

```bash
docker compose up -d --build
docker compose ps
```

Health endpoints:

- `GET /api/v1/health` — process liveness
- `GET /api/v1/ready` — MongoDB readiness

Do not route production traffic to the backend until readiness is healthy.

## Backup

The scripts require MongoDB Database Tools (`mongodump` and `mongorestore`). Example daily backup:

```bash
MONGODB_URI='mongodb://...' BACKUP_DIR=/secure/backups ./ops/backup/backup-mongodb.sh
```

Backups are compressed and accompanied by SHA-256 checksums. Copy backups to encrypted, access-controlled offsite storage. Local retention is controlled with `BACKUP_RETENTION_DAYS` (default: 14).

## Restore drill

Never test a restore against the production database first. Restore into an isolated MongoDB target:

```bash
MONGODB_URI='mongodb://test-target/...' ./ops/backup/restore-mongodb.sh /secure/backups/studmgmt-.../database.archive
```

Then verify:

1. `GET /api/v1/ready` returns 200.
2. Student count and a sample of records match expected data.
3. Authentication works with restored user/session data as expected.
4. Application logs contain no migration/index errors.

## Scaling note

Refresh sessions are already stored in MongoDB and work across backend replicas. The current rate limiter is intentionally process-local and must be replaced with a shared implementation (for example Redis) before running multiple backend instances.
## Frontend API URL and session cookies

`VITE_API_BASE_URL` is a **build-time** Vite variable. The production Docker image now requires it explicitly and Docker Compose passes it as a build argument. Set it to the browser-reachable API origin including `/api/v1`; do not use the internal Docker hostname `backend`.

Example:

```env
VITE_API_BASE_URL=https://api.students.example.com/api/v1
CORS_ORIGINS=https://students.example.com
```

Because refresh sessions use HttpOnly cookies, the frontend API origin must be allowed by the backend CORS configuration and credentialed requests must remain enabled. If the SPA and API are hosted on unrelated sites, review the cookie `SameSite` policy before deployment.

