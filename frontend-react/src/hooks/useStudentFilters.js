import { useCallback } from "react";

import { DEFAULT_PAGE_SIZE } from "../utils/constants";

const DEFAULT_SORT_BY = "createdAt";
const DEFAULT_SORT_ORDER = "desc";

export default function useStudentFilters(setSearchParams) {
  const updateParams = useCallback(
    (updater, options = {}) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);

        updater(next);

        return next;
      }, options);
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (nextPage) => {
      updateParams((params) => {
        if (nextPage <= 1) {
          params.delete("page");
        } else {
          params.set("page", String(nextPage));
        }
      });
    },
    [updateParams],
  );

  const setLimit = useCallback(
    (nextLimit) => {
      updateParams(
        (params) => {
          if (nextLimit === DEFAULT_PAGE_SIZE) {
            params.delete("limit");
          } else {
            params.set("limit", String(nextLimit));
          }

          params.delete("page");
        },
        { replace: true },
      );
    },
    [updateParams],
  );

  const setSortBy = useCallback(
    (nextSortBy) => {
      updateParams(
        (params) => {
          if (nextSortBy === DEFAULT_SORT_BY) {
            params.delete("sortBy");
          } else {
            params.set("sortBy", nextSortBy);
          }

          params.delete("page");
        },
        { replace: true },
      );
    },
    [updateParams],
  );

  const setSortOrder = useCallback(
    (nextSortOrder) => {
      updateParams(
        (params) => {
          if (nextSortOrder === DEFAULT_SORT_ORDER) {
            params.delete("sortOrder");
          } else {
            params.set("sortOrder", nextSortOrder);
          }

          params.delete("page");
        },
        { replace: true },
      );
    },
    [updateParams],
  );

  return {
    setPage,
    setLimit,
    setSortBy,
    setSortOrder,
  };
}
