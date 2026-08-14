import { useCallback } from "react";
import { DEFAULT_PAGE_SIZE } from "../utils/constants";
const DEFAULT_SORT_BY = "createdAt";
const DEFAULT_SORT_ORDER = "desc";

export default function useStudentFilters(setSearchParams) {
  const updateParams = useCallback((updater, options = {}) => setSearchParams((current) => { const next = new URLSearchParams(current); updater(next); return next; }, options), [setSearchParams]);
  const setPage = useCallback((nextPage) => updateParams((params) => { if (nextPage <= 1) params.delete("page"); else params.set("page", String(nextPage)); }), [updateParams]);
  const setValue = useCallback((key, value, defaultValue = "") => updateParams((params) => { if (!value || value === defaultValue) params.delete(key); else params.set(key, String(value)); params.delete("page"); }, { replace: true }), [updateParams]);
  return {
    setPage,
    setLimit: (value) => setValue("limit", value, DEFAULT_PAGE_SIZE),
    setSortBy: (value) => setValue("sortBy", value, DEFAULT_SORT_BY),
    setSortOrder: (value) => setValue("sortOrder", value, DEFAULT_SORT_ORDER),
    setClass: (value) => setValue("class", value),
    setSection: (value) => setValue("section", value),
    setStatus: (value) => setValue("status", value),
    clearFilters: () => setSearchParams(new URLSearchParams(), { replace: true }),
  };
}
