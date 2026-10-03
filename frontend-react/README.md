# StudentHub web app

React app for staff and the student/guardian portal. See the [root README](../README.md) for running the whole system.

- Stack: React, Vite, React Router, TanStack Query, React Hook Form, Zod, Axios
- Dev server: http://localhost:13000 (forwards `/api` to the API on `127.0.0.1:5000`)
- API base URL: `/api/v1` on the same origin; override with `VITE_API_BASE_URL` only if the API is hosted elsewhere

```bash
npm run dev      # development
npm run build    # production build
npm run lint
npm test
```
