import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="not-found-page">
      <div className="not-found-content">
        <span>404</span>

        <h1>Page not found</h1>

        <p>
          The page you are looking for does not exist or may have been moved.
        </p>

        <Link to="/dashboard" className="button button-primary">
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}
