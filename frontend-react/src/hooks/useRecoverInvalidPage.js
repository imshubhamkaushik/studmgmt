import { useEffect } from "react";

export default function useRecoverInvalidPage({
  page,
  pagination,
  setSearchParams,
}) {
  useEffect(() => {
    if (!pagination) {
      return;
    }

    if (pagination.totalItems === 0 || page <= pagination.totalPages) {
      return;
    }

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);

        if (pagination.totalPages <= 1) {
          next.delete("page");
        } else {
          next.set("page", String(pagination.totalPages));
        }

        return next;
      },
      { replace: true },
    );
  }, [page, pagination, setSearchParams]);
}
