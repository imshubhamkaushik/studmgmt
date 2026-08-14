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
Use a managed/shared rate-limit store for multi-instance deployments, terminate TLS at a trusted proxy/load balancer, and add monitoring/alerting for failed login spikes and backup failures.

## Phase 15 additions

- Docker Compose now waits for MongoDB health before starting the backend and waits for backend health before starting the frontend.
- MongoDB credentials are supplied from deployment secrets and MongoDB is not published to the host network.
- Startup now fails when `JWT_SECRET` is missing or shorter than 32 characters.
- `ops/backup/backup-mongodb.sh` creates compressed archives, SHA-256 checksums, and applies local retention.
- `ops/backup/restore-mongodb.sh` verifies checksums when available and restores with `--drop`; always run restore drills against an isolated target first.
- Full horizontal scaling still requires replacing the process-local rate limiter with a shared store.
