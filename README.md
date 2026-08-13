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
