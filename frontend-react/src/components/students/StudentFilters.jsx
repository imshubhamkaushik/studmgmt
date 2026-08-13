import { PAGE_SIZE_OPTIONS, STUDENT_SORT_OPTIONS } from "../../utils/constants";

export default function StudentFilters({
  search,
  onSearchChange,
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
          placeholder="Search by name, class or Student ID..."
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>
          <span>Sort by</span>

          <select
            value={sortBy}
            onChange={(event) => onSortByChange(event.target.value)}
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
            onChange={(event) => onSortOrderChange(event.target.value)}
          >
            <option value="desc">Descending</option>

            <option value="asc">Ascending</option>
          </select>
        </label>

        <label>
          <span>Rows</span>

          <select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
