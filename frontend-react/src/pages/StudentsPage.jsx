import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useBulkUpdateStudents, useDeleteStudent, useRestoreStudent, useStudentFilterOptions, useStudents } from "../hooks/useStudents";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import useStudentFilters from "../hooks/useStudentFilters";
import useSyncSearchWithUrl from "../hooks/useSyncSearchWithUrl";
import useRecoverInvalidPage from "../hooks/useRecoverInvalidPage";
import { getStudentFilters } from "../utils/studentFilters";
import StudentFilters from "../components/students/StudentFilters";
import StudentsContent from "../components/students/StudentsContent";
import DeleteStudentModal from "../components/students/DeleteStudentModal";
import StudentImportExport from "../components/students/StudentImportExport";
import { getApiErrorMessage } from "../utils/apiErrorMessage";
import { useToast } from "../components/common/ToastProvider";

export default function StudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = getStudentFilters(searchParams);
  const [searchInput, setSearchInput] = useState(filters.search);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("active");
  const [savedViews, setSavedViews] = useState(() => JSON.parse(localStorage.getItem("studentSavedViews") || "[]"));
  const { show } = useToast();
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const { setPage, setLimit, setSortBy, setSortOrder, setClass, setSection, setStatus, clearFilters } = useStudentFilters(setSearchParams);
  useSyncSearchWithUrl({ urlSearch: filters.search, debouncedSearch, setSearchInput, setSearchParams });
  const { data: filterOptionsData } = useStudentFilterOptions();
  const { data, isLoading, isError, error, refetch } = useStudents({
    page: filters.page, limit: filters.limit, search: filters.search, sortBy: filters.sortBy, sortOrder: filters.sortOrder,
    class: filters.className || undefined, section: filters.section || undefined, status: filters.status || undefined,
    includeDeleted: filters.includeDeleted || undefined,
  });
  const deleteMutation = useDeleteStudent();
  const restoreMutation = useRestoreStudent();
  const bulkMutation = useBulkUpdateStudents();
  const students = data?.data ?? [];
  const pagination = data?.pagination;
  useRecoverInvalidPage({ page: filters.page, pagination, setSearchParams });

  const setArchivedView = (value) => {
    setSelectedIds([]);
    setSearchParams((current) => { const next = new URLSearchParams(current); value ? next.set("includeDeleted", "true") : next.delete("includeDeleted"); next.set("page", "1"); return next; });
  };
  const toggle = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const toggleAll = (ids) => setSelectedIds((current) => ids.every((id) => current.includes(id)) ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]);
  const handleDelete = async () => {
    if (!studentToDelete) return;
    await deleteMutation.mutateAsync(studentToDelete._id);
    setStudentToDelete(null); setSelectedIds((ids) => ids.filter((id) => id !== studentToDelete._id));
  };
  const handleRestore = async (student) => { await restoreMutation.mutateAsync(student._id); };
  const handleBulk = async () => { if (selectedIds.length) { await bulkMutation.mutateAsync({ ids: selectedIds, status: bulkStatus }); setSelectedIds([]); } };
  const errorMessage = deleteMutation.isError ? getApiErrorMessage(deleteMutation.error, "Unable to archive the student.") : null;
  const saveCurrentView = () => {
    const name = window.prompt("Name this saved view:");
    if (!name?.trim()) return;
    const params = searchParams.toString();
    const next = [...savedViews.filter((view) => view.name !== name.trim()), { name: name.trim(), params }];
    setSavedViews(next); localStorage.setItem("studentSavedViews", JSON.stringify(next)); show(`Saved view "${name.trim()}".`);
  };
  const loadView = (view) => { setSelectedIds([]); setSearchParams(new URLSearchParams(view.params)); };
  const removeView = (name) => { const next = savedViews.filter((view) => view.name !== name); setSavedViews(next); localStorage.setItem("studentSavedViews", JSON.stringify(next)); };
  const handleDeleteWithToast = async () => { try { await handleDelete(); show("Student archived."); } catch (err) { show(getApiErrorMessage(err, "Unable to archive the student."), "error"); } };
  const handleRestoreWithToast = async (student) => { try { await handleRestore(student); show("Student restored."); } catch (err) { show(getApiErrorMessage(err, "Unable to restore the student."), "error"); } };
  const handleBulkWithToast = async () => { try { await handleBulk(); show("Selected students updated."); } catch (err) { show(getApiErrorMessage(err, "Bulk update failed."), "error"); } };

  return <div className="students-page">
    <div className="page-toolbar">
      <div className="saved-views"><span>Quick views:</span><button type="button" className="text-link" onClick={saveCurrentView}>Save current</button>{savedViews.map((view) => <span key={view.name} className="saved-view"><button type="button" onClick={() => loadView(view)}>{view.name}</button><button type="button" aria-label={`Remove ${view.name}`} onClick={() => removeView(view.name)}>×</button></span>)}</div>
      <StudentFilters search={searchInput} onSearchChange={setSearchInput} sortBy={filters.sortBy} onSortByChange={setSortBy} sortOrder={filters.sortOrder} onSortOrderChange={setSortOrder} className={filters.className} onClassChange={setClass} section={filters.section} onSectionChange={setSection} status={filters.status} onStatusChange={setStatus} options={filterOptionsData?.data} onClearFilters={clearFilters} limit={filters.limit} onLimitChange={setLimit} />
      <div className="toolbar-actions">
        <StudentImportExport filters={filters} />
        <button type="button" className="button button-secondary" onClick={() => setArchivedView(!filters.includeDeleted)}>{filters.includeDeleted ? "Active Students" : "Archived Students"}</button>
        <button type="button" className="button button-secondary" onClick={() => window.print()}>Print Directory</button>
        <Link to="/students/new" className="button button-primary">+ Add Student</Link>
      </div>
    </div>
    {selectedIds.length > 0 && !filters.includeDeleted && <div className="bulk-actions">
      <strong>{selectedIds.length} selected</strong>
      <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)}>
        {(filterOptionsData?.data?.statuses ?? ["active","inactive","graduated","transferred","suspended"]).map((status) => <option key={status} value={status}>{status}</option>)}
      </select>
      <button type="button" className="button button-primary" disabled={bulkMutation.isPending} onClick={handleBulkWithToast}>{bulkMutation.isPending ? "Updating..." : "Update Status"}</button>
      <button type="button" className="button button-secondary" onClick={() => setSelectedIds([])}>Clear Selection</button>
    </div>}
    {bulkMutation.isError && <p className="inline-error">{getApiErrorMessage(bulkMutation.error, "Bulk update failed.")}</p>}
    <StudentsContent isLoading={isLoading} isError={isError} error={error} refetch={refetch} students={students} pagination={pagination} search={filters.search} page={filters.page} onPageChange={setPage} onDelete={setStudentToDelete} onRestore={handleRestoreWithToast} selectedIds={selectedIds} onToggle={toggle} onToggleAll={toggleAll} showArchived={filters.includeDeleted} />
    <DeleteStudentModal student={studentToDelete} isDeleting={deleteMutation.isPending} onConfirm={handleDeleteWithToast} errorMessage={errorMessage} onClose={() => !deleteMutation.isPending && setStudentToDelete(null)} />
  </div>;
}