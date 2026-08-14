# Student Management System

Full-stack Student Management System built with React, Express and MongoDB.

## Features

- Student CRUD with immutable, atomically generated Student IDs
- Class, Section and Roll Number management
- Database-level uniqueness for `class + section + rollNo`
- Strict `YYYY-MM-DD` DOB validation
- Search, sorting and pagination with server-side guardrails
- Dashboard statistics
- Centralized API errors and React Query data management
- Backend validation tests and GitHub Actions CI

## API

Base URL: `/api/v1`

- `GET /health`
- `GET /ready`
- `GET /students`
- `POST /students`
- `GET /students/:id`
- `PATCH /students/:id`
- `DELETE /students/:id`
- `GET /dashboard/stats`

## Setup

```bash
npm install
npm --prefix backend install
npm --prefix frontend-react install
```

Copy the example environment files:

```text
backend/.env.example -> backend/.env
frontend-react/.env.example -> frontend-react/.env
```

Start development:

```bash
npm run dev
```

Frontend: `http://localhost:5173`  
API health: `http://localhost:5000/api/v1/health`

## Validation commands

```bash
npm --prefix backend test
npm --prefix frontend-react run lint
npm --prefix frontend-react run build
```

## Student ID migration

Inspect legacy data without changing it:

```bash
npm --prefix backend run migrate:student-ids -- --dry-run
```

Student IDs are unique and monotonic, but are not guaranteed to be gapless.

## Latest feature upgrade

The student module now supports a complete student lifecycle and richer data operations:

- Student statuses: `active`, `inactive`, `graduated`, `transferred`, `suspended`
- Advanced filtering by class, section and status
- CSV export for the current filtered student set
- CSV import (up to 500 students per request) with server-side validation and duplicate detection
- Dashboard active-student and status analytics
- Unique `class + section + rollNo` data integrity rule

### New API endpoints

- `GET /api/v1/students/filter-options`
- `GET /api/v1/students/export`
- `POST /api/v1/students/import`

CSV import accepts JSON from the frontend after local CSV parsing:

```json
{
  "students": [
    {
      "name": "Alice Smith",
      "class": "10",
      "section": "A",
      "rollNo": 1,
      "status": "active",
      "dob": "2008-02-29"
    }
  ]
}
```

For existing databases, migrate legacy records before relying on status filters:

```bash
cd backend
npm run migrate:student-statuses -- --dry-run
npm run migrate:student-statuses
```

## Attendance

The application now supports daily attendance for active students. Open **Attendance**, select a date, class, and section, load active students, mark `present`, `absent`, `late`, or `excused`, and save. Saving the same student/date again updates the existing record instead of creating duplicates.

API endpoints:

- `GET /api/v1/attendance`
- `POST /api/v1/attendance/bulk`
- `GET /api/v1/attendance/summary`
- `GET /api/v1/attendance/student/:studentId`

Attendance is protected by a unique `student + date` database index. Future dates and duplicate student IDs inside a bulk request are rejected.

## Academic structure

The application now supports **Academic Years** and **Classrooms** without destructively migrating existing students. Create an academic year, set one active, then create class/section classrooms with optional capacity. This is a compatibility bridge for the existing student `class` and `section` fields; the next migration phase can attach students to year-specific enrollments before promotion is enabled.


## Enrollment and Promotion
Students can now be assigned to an Academic Year and Classroom through `/api/v1/enrollments`. Enrollment history is preserved. Capacity and destination roll-number conflicts are validated. Promotion is available through `POST /api/v1/enrollments/promote`; it prevalidates the complete batch before changing source enrollments and creating destination placements.


## Authentication and roles

The API now requires a Bearer access token for all business endpoints. Configure `JWT_SECRET` (at least 32 characters) and bootstrap the first administrator with `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Access tokens are short-lived (default 15 minutes). Roles are `admin`, `staff`, and `teacher`.

- Admin: full management, academic structure, promotion and users.
- Staff: student and enrollment management plus attendance.
- Teacher: read access and attendance marking.

Create additional users through the **Users & Roles** screen as an administrator. Do not commit real secrets or bootstrap passwords.

## Phase 11 production hardening
Refresh-session rotation, HttpOnly refresh cookies, server-side session revocation, logout, user-deactivation session revocation, and corrected production Docker environment wiring are included. See `PRODUCTION_HARDENING.md`.


## Phase 13: Audit identity and teacher classroom access

- Audit writes automatically capture the authenticated actor from request context.
- Admins can assign/revoke teachers to/from classrooms through `/api/v1/teacher-classroom-assignments`.
- Teachers are server-side restricted from marking or querying attendance for classrooms they are not assigned to.
- Assignment checks are authorization controls; hiding frontend navigation alone is not relied on for security.


## Phase 13 teacher access
Teachers are assigned to classrooms by administrators. Server-side student and enrollment queries are scoped to assigned classrooms; direct student profile and audit-history access is denied when the teacher has no active placement for that student.

## Production operations

See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for Docker startup, health/readiness checks, backup, restore drills, secrets, TLS, and scaling requirements.

### Phase 20 verification fix

A dependency consistency issue was found during the final validation pass: `cookie-parser` had been added to `backend/package.json` in an earlier phase without a matching `backend/package-lock.json` update, which would cause `npm ci` in CI and Docker builds to fail. The backend now uses a small internal cookie-parsing middleware, removing that unsynchronised dependency. `npm ci` can therefore use the committed lockfile consistently. Docker itself could not be executed in this workspace because the Docker CLI is unavailable.
