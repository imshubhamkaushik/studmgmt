import { useState } from "react";
import { Link } from "react-router-dom";

import { useDeleteStudent, useStudents } from "../hooks/useStudents";

import { useDebouncedValue } from "../hooks/useDebouncedValue";

import { DEFAULT_PAGE_SIZE } from "../utils/constants";

import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import EmptyState from "../components/common/EmptyState";
import Pagination from "../components/common/Pagination";

import StudentFilters from "../components/students/StudentFilters";
import StudentTable from "../components/students/StudentTable";
import DeleteStudentModal from "../components/students/DeleteStudentModal";

export default function StudentsPage() {
  const [searchInput, setSearchInput] = useState("");

  const [page, setPage] = useState(1);

  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);

  const [sortBy, setSortBy] = useState("createdAt");

  const [sortOrder, setSortOrder] = useState("desc");

  const [studentToDelete, setStudentToDelete] = useState(null);

  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const queryParams = {
    page,
    limit,
    search: debouncedSearch,
    sortBy,
    sortOrder,
  };

  const { data, isLoading, isError, error, refetch } = useStudents(queryParams);

  const deleteMutation = useDeleteStudent();

  const handleSearchChange = (value) => {
    setSearchInput(value);
    setPage(1);
  };

  const handleSortByChange = (value) => {
    setSortBy(value);
    setPage(1);
  };

  const handleSortOrderChange = (value) => {
    setSortOrder(value);
    setPage(1);
  };

  const handleLimitChange = (value) => {
    setLimit(value);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!studentToDelete) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(studentToDelete._id);

      setStudentToDelete(null);
    } catch {
      // The error state is shown inside the modal below.
    }
  };

  const students = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="students-page">
      <div className="page-toolbar">
        <StudentFilters
          search={searchInput}
          onSearchChange={handleSearchChange}
          sortBy={sortBy}
          onSortByChange={handleSortByChange}
          sortOrder={sortOrder}
          onSortOrderChange={handleSortOrderChange}
          limit={limit}
          onLimitChange={handleLimitChange}
        />

        <Link to="/students/new" className="button button-primary">
          + Add Student
        </Link>
      </div>

      {isLoading ? (
        <LoadingState message="Loading students..." />
      ) : isError ? (
        <ErrorState
          message={error?.message || "Unable to load students."}
          onRetry={refetch}
        />
      ) : students.length === 0 ? (
        <EmptyState
          title={debouncedSearch ? "No matching students" : "No students yet"}
          message={
            debouncedSearch
              ? "Try changing your search criteria."
              : "Start by adding your first student."
          }
          action={
            !debouncedSearch && (
              <Link to="/students/new" className="button button-primary">
                Add Student
              </Link>
            )
          }
        />
      ) : (
        <>
          <StudentTable students={students} onDelete={setStudentToDelete} />

          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}

      <DeleteStudentModal
        student={studentToDelete}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setStudentToDelete(null);
          }
        }}
      />

      {deleteMutation.isError && studentToDelete && (
        <div className="mutation-error" role="alert">
          {deleteMutation.error?.message || "Unable to delete the student."}
        </div>
      )}
    </div>
  );
}
