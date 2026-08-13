import { Link } from "react-router-dom";

import EmptyState from "../common/EmptyState";

export default function StudentsEmptyState({
  pagination,
  search,
  page,
  onPageChange,
}) {
  const hasStudents = (pagination?.totalItems ?? 0) > 0;

  const title = getEmptyTitle({
    hasStudents,
    search,
  });

  const message = getEmptyMessage({
    hasStudents,
    search,
  });

  const action = getEmptyAction({
    hasStudents,
    search,
    page,
    onPageChange,
  });

  return <EmptyState title={title} message={message} action={action} />;
}

function getEmptyTitle({ hasStudents, search }) {
  if (hasStudents) {
    return "No students on this page";
  }

  if (search) {
    return "No matching students";
  }

  return "No students yet";
}

function getEmptyMessage({ hasStudents, search }) {
  if (hasStudents) {
    return "Try going back to the previous page.";
  }

  if (search) {
    return "Try changing your search criteria.";
  }

  return "Start by adding your first student.";
}

function getEmptyAction({ hasStudents, search, page, onPageChange }) {
  if (hasStudents) {
    return (
      <button
        type="button"
        className="button button-secondary"
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        Previous Page
      </button>
    );
  }

  if (search) {
    return null;
  }

  return (
    <Link to="/students/new" className="button button-primary">
      Add Student
    </Link>
  );
}
