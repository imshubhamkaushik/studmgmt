import { PAGE_SIZE_OPTIONS, STUDENT_SORT_OPTIONS } from "../../utils/constants";

export default function StudentFilters({
  search,
  onSearchChange,
  className,
  onClassChange,
  section,
  onSectionChange,
  status,
  onStatusChange,
  options,
  onClearFilters,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  limit,
  onLimitChange,
}) {
  return (
    <div className="student-filters">
      <div className="search-field">
        <label htmlFor="student-search" className="sr-only">
          Search students
        </label>
        <input
          id="student-search"
          type="search"
          value={search}
          maxLength="100"
          placeholder="Search by name, class, section or Student ID..."
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="filter-group">
        <label>
          <span>Class</span>
          <select
            value={className}
            onChange={(e) => onClassChange(e.target.value)}
          >
            <option value="">All classes</option>
            {(options?.classes ?? []).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Section</span>
          <select
            value={section}
            onChange={(e) => onSectionChange(e.target.value)}
          >
            <option value="">All sections</option>
            {(options?.sections ?? []).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="">All statuses</option>
            {(options?.statuses ?? []).map((value) => (
              <option key={value} value={value}>
                {value[0].toUpperCase() + value.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Sort by</span>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
          >
            {STUDENT_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Order</span>
          <select
            value={sortOrder}
            onChange={(e) => onSortOrderChange(e.target.value)}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>
        <label>
          <span>Rows</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="button button-secondary button-small"
          onClick={onClearFilters}
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
