# Phase 18 Verification and Access-Control Audit

## Implemented in this phase

- Added integration coverage for teacher access to an assigned classroom.
- Added cross-classroom denial coverage for teachers.
- Closed a server-side gap: teacher access to `/api/v1/attendance/student/:studentId` is now checked against active classroom assignments.
- Added integration coverage for an unassigned teacher being denied student attendance history.
- Added integration coverage proving attendance audit records persist the authenticated actor ID and email.
- Fixed the `AuditLog.entityId` schema so audit events whose entity is a logical composite key (for example bulk attendance `class-section-date`) are no longer rejected by ObjectId casting. `entityId` now accepts both ObjectIds and string identifiers.
- Corrected the classroom populate projection in teacher assignment listing.

## Verification performed

Backend unit tests were executed locally:

- Tests: 9
- Passed: 9
- Failed: 0

The expanded HTTP/database integration suite was added but was not executed in this workspace because no isolated MongoDB service was started for this turn. GitHub Actions remains configured to run integration tests against a MongoDB service.

## Remaining real-environment checks

- Execute the expanded integration suite against MongoDB.
- Add a real Redis integration test rather than only unit-testing the in-memory fallback.
- Run Docker Compose end-to-end with generated production secrets.
- Perform a backup -> restore -> application verification drill against an isolated MongoDB instance.


## Phase 19 follow-up

Added a Redis-backed rate-limiter integration test. The GitHub Actions integration job now exports `REDIS_URL` for the Redis service, so the shared-store path is exercised in CI rather than only the in-memory fallback.
