import LoadingState from "../common/LoadingState";
import ErrorState from "../common/ErrorState";
import Pagination from "../common/Pagination";
import StudentTable from "./StudentTable";
import StudentsEmptyState from "./StudentsEmptyState";

import { getApiErrorMessage } from "../../utils/apiErrorMessage";

export default function StudentsContent({
  isLoading,
  isError,
  error,
  refetch,
  students,
  pagination,
  search,
  page,
  onPageChange,
  onDelete,
  onRestore,
  selectedIds,
  onToggle,
  onToggleAll,
  showArchived,
  sortBy,
  sortOrder,
  onSortChange,
}) {
  if (isLoading) {
    return <LoadingState message="Loading students..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Unable to load students"
        message={getApiErrorMessage(error, "Unable to load students.")}
        onRetry={refetch}
      />
    );
  }

  if (students.length === 0) {
    return (
      <StudentsEmptyState
        pagination={pagination}
        search={search}
        page={page}
        onPageChange={onPageChange}
      />
    );
  }

  return (
    <>
      <StudentTable
        students={students}
        onDelete={onDelete}
        onRestore={onRestore}
        selectedIds={selectedIds}
        onToggle={onToggle}
        onToggleAll={onToggleAll}
        showArchived={showArchived}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
      />

      <Pagination pagination={pagination} onPageChange={onPageChange} />
    </>
  );
}
