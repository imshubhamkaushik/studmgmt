# StudentHub Frontend

React frontend for the Student Management System.

## Stack

- React
- Vite
- React Router
- TanStack Query
- React Hook Form
- Zod
- Axios

## Development

From `test/`:

```bash
npm run frontend
```

Or run the complete application:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Configure the backend API with `frontend-react/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

## Build

```bash
npm --prefix frontend-react run build
```

## Lint

```bash
npm --prefix frontend-react run lint
```
