# Phase 21 Runtime Audit

## Fixed

### Production frontend build configuration

The frontend API client requires `VITE_API_BASE_URL`, but the previous production Docker build did not provide it. Vite resolves this variable at build time, so the container build could fail with `VITE_API_BASE_URL is not configured.`

The frontend Dockerfile now requires `VITE_API_BASE_URL` as a build argument, and Docker Compose passes the required value. The production environment template documents a browser-reachable API URL.

## Also verified by inspection

- Backend CORS uses an explicit allowlist and `credentials: true`.
- Frontend Axios uses `withCredentials: true`.
- Express enables `trust proxy`, allowing secure-cookie behavior behind a standard reverse proxy.
- Refresh cookies are scoped to `/api/v1/auth`.

## Not executed in this workspace

Docker is unavailable here, so the Compose stack was not built or started. A real `docker compose build`/`up` run remains required.
