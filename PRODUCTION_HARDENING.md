# Production hardening (Phase 11)

## Sessions
- Access tokens are short-lived JWTs.
- Refresh tokens are random 384-bit values stored only as SHA-256 hashes in MongoDB.
- Refresh uses rotation: the old session is revoked and replaced on every refresh.
- Logout revokes the current refresh session.
- Deactivating a user revokes all active sessions for that user.
- In production the refresh token cookie is `HttpOnly`, `Secure`, and `SameSite=Strict`.

## Required environment
Set a strong `JWT_SECRET` (32+ characters), `MONGODB_URI`, and production CORS origins. Never commit real secrets.

## Docker
`docker-compose.yml` now uses the correct `MONGODB_URI` name and requires `JWT_SECRET` from the deployment environment.

## Backups
Run `mongodump` against the production database on a scheduled, encrypted, access-controlled backup target. Regularly test restores with `mongorestore`; a backup that has never been restored is not a verified backup.

## Remaining production work
Terminate TLS at a trusted proxy/load balancer, add monitoring/alerting for failed login spikes and backup failures, and set up log shipping (the app logs structured JSON to stdout but nothing forwards it anywhere by default).

## Phase 15 additions

- Docker Compose now waits for MongoDB health before starting the backend and waits for backend health before starting the frontend.
- MongoDB credentials are supplied from deployment secrets and MongoDB is not published to the host network.
- Startup now fails when `JWT_SECRET` is missing or shorter than 32 characters.
- `ops/backup/backup-mongodb.sh` creates compressed archives, SHA-256 checksums, and applies local retention.
- `ops/backup/restore-mongodb.sh` verifies checksums when available and restores with `--drop`; always run restore drills against an isolated target first.
- The rate limiter is Redis-backed when `REDIS_URL` is set (already the case in `docker-compose.yml`), making it safe to run multiple backend replicas behind a load balancer. It falls back to a process-local in-memory store only when `REDIS_URL` is unset or Redis is unreachable — if you deploy outside the bundled Compose stack (Kubernetes, ECS, bare metal), make sure `REDIS_URL` is set in that environment too, or each replica will rate-limit independently instead of sharing one counter. This is covered by an integration test in CI (see `CI_AND_TESTING.md`).

## Account lockout (Phase 22)

In addition to the IP-based rate limiter above, individual accounts now lock for 15 minutes after 5 consecutive failed login attempts, independent of source IP. Admins can see lock status in the Users page and clear it via an explicit unlock action or by resetting the user's password — either clears `failedLoginAttempts`/`lockedUntil` without waiting out the timer.
