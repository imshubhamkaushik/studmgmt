import Button from "./Button";

export default function Pagination({ pagination, onPageChange, itemLabel = "students", itemLabelSingular }) {
  if (!pagination) {
    return null;
  }

  const { page, limit, totalItems, totalPages, hasPreviousPage, hasNextPage } =
    pagination;

  const start = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const end = totalItems === 0 ? 0 : Math.min(page * limit, totalItems);
  const singular = itemLabelSingular || itemLabel.replace(/s$/, "");

  let summary = `No ${itemLabel}`;

  if (totalItems > 0) {
    const label = totalItems === 1 ? singular : itemLabel;

    summary = `Showing ${start}-${end} of ${totalItems} ${label}`;
  }

  return (
    <div className="pagination">
      <p className="pagination-summary">{summary}</p>

      {totalPages > 1 && (
        <div className="pagination-actions">
          <Button
            variant="secondary"
            disabled={!hasPreviousPage}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>

          <span className="pagination-page">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="secondary"
            disabled={!hasNextPage}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
