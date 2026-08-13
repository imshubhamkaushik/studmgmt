import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useDeleteStudent, useStudents } from "../hooks/useStudents";

import { useDebouncedValue } from "../hooks/useDebouncedValue";

import useStudentFilters from "../hooks/useStudentFilters";
import useSyncSearchWithUrl from "../hooks/useSyncSearchWithUrl";
import useRecoverInvalidPage from "../hooks/useRecoverInvalidPage";

import { getStudentFilters } from "../utils/studentFilters";

import StudentFilters from "../components/students/StudentFilters";
import StudentsContent from "../components/students/StudentsContent";
import DeleteStudentModal from "../components/students/DeleteStudentModal";

import { getApiErrorMessage } from "../utils/apiErrorMessage";

export default function StudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = getStudentFilters(searchParams);

  const [searchInput, setSearchInput] = useState(filters.search);

  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const { setPage, setLimit, setSortBy, setSortOrder } =
    useStudentFilters(setSearchParams);

  useSyncSearchWithUrl({
    urlSearch: filters.search,
    debouncedSearch,
    setSearchInput,
    setSearchParams,
  });

  const { data, isLoading, isError, error, refetch } = useStudents({
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  const deleteMutation = useDeleteStudent();

  const [studentToDelete, setStudentToDelete] = useState(null);

  const students = data?.data ?? [];

  const pagination = data?.pagination;

  useRecoverInvalidPage({
    page: filters.page,
    pagination,
    setSearchParams,
  });

  const handleDelete = async () => {
    if (!studentToDelete) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(studentToDelete._id);

      if (students.length === 1 && filters.page > 1) {
        setPage(filters.page - 1);
      }

      setStudentToDelete(null);
    } catch {
      // DeleteStudentModal displays the mutation error.
    }
  };

  const deleteErrorMessage = deleteMutation.isError
    ? getApiErrorMessage(deleteMutation.error, "Unable to delete the student.")
    : null;

  return (
    <div className="students-page">
      <div className="page-toolbar">
        <StudentFilters
          search={searchInput}
          onSearchChange={setSearchInput}
          sortBy={filters.sortBy}
          onSortByChange={setSortBy}
          sortOrder={filters.sortOrder}
          onSortOrderChange={setSortOrder}
          limit={filters.limit}
          onLimitChange={setLimit}
        />

        <Link to="/students/new" className="button button-primary">
          + Add Student
        </Link>
      </div>

      <StudentsContent
        isLoading={isLoading}
        isError={isError}
        error={error}
        refetch={refetch}
        students={students}
        pagination={pagination}
        search={filters.search}
        page={filters.page}
        onPageChange={setPage}
        onDelete={setStudentToDelete}
      />

      <DeleteStudentModal
        student={studentToDelete}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleDelete}
        errorMessage={deleteErrorMessage}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setStudentToDelete(null);
          }
        }}
      />
    </div>
  );
}
