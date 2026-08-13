import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useDeleteStudent, useStudents } from "../hooks/useStudents";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  STUDENT_SORT_OPTIONS,
} from "../utils/constants";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import { getApiErrorMessage } from "../utils/apiErrorMessage";
import EmptyState from "../components/common/EmptyState";
import Pagination from "../components/common/Pagination";
import StudentFilters from "../components/students/StudentFilters";
import StudentTable from "../components/students/StudentTable";
import DeleteStudentModal from "../components/students/DeleteStudentModal";

export default function StudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";

  const page = parsePositiveParam(searchParams.get("page"), 1);
  const limit = PAGE_SIZE_OPTIONS.includes(
    parsePositiveParam(searchParams.get("limit"), DEFAULT_PAGE_SIZE),
  )
    ? parsePositiveParam(searchParams.get("limit"), DEFAULT_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  const sortBy = STUDENT_SORT_OPTIONS.some(
    (option) => option.value === searchParams.get("sortBy"),
  )
    ? searchParams.get("sortBy")
    : "createdAt";

  const sortOrder = ["asc", "desc"].includes(
    searchParams.get("sortOrder") ?? "desc",
  )
    ? searchParams.get("sortOrder")
    : "desc";

  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    const normalizedSearch = debouncedSearch.trim();

    if (normalizedSearch === urlSearch) {
      return;
    }

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);

        if (normalizedSearch) {
          next.set("search", normalizedSearch);
        } else {
          next.delete("search");
        }

        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, urlSearch, setSearchParams]);

  const setPage = (nextPage) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextPage <= 1) {
        next.delete("page");
      } else {
        next.set("page", String(nextPage));
      }
      return next;
    });
  };

  const setLimit = (nextLimit) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (nextLimit === DEFAULT_PAGE_SIZE) {
          next.delete("limit");
        } else {
          next.set("limit", String(nextLimit));
        }
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  };

  const setSortBy = (nextSortBy) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (nextSortBy === "createdAt") {
          next.delete("sortBy");
        } else {
          next.set("sortBy", nextSortBy);
        }
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  };

  const setSortOrder = (nextSortOrder) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (nextSortOrder === "desc") {
          next.delete("sortOrder");
        } else {
          next.set("sortOrder", nextSortOrder);
        }
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  };

  const queryParams = {
    page,
    limit,
    search: urlSearch,
    sortBy,
    sortOrder,
  };

  const { data, isLoading, isError, error, refetch } = useStudents(queryParams);
  const deleteMutation = useDeleteStudent();
  const [studentToDelete, setStudentToDelete] = useState(null);

  const students = data?.data ?? [];
  const pagination = data?.pagination;

  useEffect(() => {
    if (
      pagination &&
      pagination.totalItems > 0 &&
      page > pagination.totalPages
    ) {
      setPage(pagination.totalPages);
    }
  }, [page, pagination?.totalItems, pagination?.totalPages]);

  const handleDelete = async () => {
    if (!studentToDelete) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(studentToDelete._id);

      if (students.length === 1 && page > 1) {
        setPage(page - 1);
      }

      setStudentToDelete(null);
    } catch {
      // The error state is shown below.
    }
  };

  return (
    <div className="students-page">
      <div className="page-toolbar">
        <StudentFilters
          search={searchInput}
          onSearchChange={setSearchInput}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          limit={limit}
          onLimitChange={setLimit}
        />

        <Link to="/students/new" className="button button-primary">
          + Add Student
        </Link>
      </div>

      {isLoading ? (
        <LoadingState message="Loading students..." />
      ) : isError ? (
        <ErrorState
          message={getApiErrorMessage(error, "Unable to load students.")}
          onRetry={refetch}
        />
      ) : students.length === 0 ? (
        <EmptyState
          title={
            pagination?.totalItems > 0
              ? "No students on this page"
              : urlSearch
                ? "No matching students"
                : "No students yet"
          }
          message={
            pagination?.totalItems > 0
              ? "Try going back to the previous page."
              : urlSearch
                ? "Try changing your search criteria."
                : "Start by adding your first student."
          }
          action={
            pagination?.totalItems > 0 ? (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setPage(Math.max(1, page - 1))}
              >
                Previous Page
              </button>
            ) : (
              !urlSearch && (
                <Link to="/students/new" className="button button-primary">
                  Add Student
                </Link>
              )
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
        errorMessage={
          deleteMutation.isError
            ? getApiErrorMessage(
                deleteMutation.error,
                "Unable to delete the student.",
              )
            : null
        }
        onClose={() => {
          if (!deleteMutation.isPending) {
            setStudentToDelete(null);
          }
        }}
      />
    </div>
  );
}

function parsePositiveParam(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
