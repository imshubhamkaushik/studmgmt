# CI and Integration Testing

The repository now contains a GitHub Actions workflow at `.github/workflows/ci.yml`.

## Jobs

- **Backend unit tests**: installs the backend and runs `npm test`.
- **Backend integration tests**: starts an isolated MongoDB service and runs HTTP-level authentication and authorization tests.
- **Frontend**: installs dependencies, runs ESLint, and performs a Vite production build.

## Local commands

```bash
npm run test:backend
npm run build
npm run lint
```

Integration tests require an isolated MongoDB database and must never point at a production database:

```bash
export TEST_MONGODB_URI='mongodb://127.0.0.1:27017/studmgmt_test'
export JWT_SECRET='replace-with-a-test-secret-longer-than-32-characters'
npm run test:integration
```

The integration suite currently verifies role boundaries, rejection of deactivated accounts with otherwise valid access tokens, and refresh-token rotation/revocation. CI runs these tests against its own MongoDB service.


## Redis-backed rate limiter integration test

The integration suite also exercises the shared limiter against a real Redis service when `REDIS_URL` is configured. CI uses Redis database `15` and verifies that two requests are allowed and the next request receives `429`. The test is skipped locally when `REDIS_URL` is intentionally absent.
