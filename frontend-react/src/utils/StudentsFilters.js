import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  STUDENT_SORT_OPTIONS,
} from "./constants";

const DEFAULT_SORT_BY = "createdAt";
const DEFAULT_SORT_ORDER = "desc";

export function getStudentFilters(searchParams) {
  const page = parsePositiveParam(searchParams.get("page"), 1);

  const requestedLimit = parsePositiveParam(
    searchParams.get("limit"),
    DEFAULT_PAGE_SIZE,
  );

  const limit = PAGE_SIZE_OPTIONS.includes(requestedLimit)
    ? requestedLimit
    : DEFAULT_PAGE_SIZE;

  const requestedSortBy = searchParams.get("sortBy");

  const sortBy = STUDENT_SORT_OPTIONS.some(
    (option) => option.value === requestedSortBy,
  )
    ? requestedSortBy
    : DEFAULT_SORT_BY;

  const requestedSortOrder = searchParams.get("sortOrder");

  const sortOrder = ["asc", "desc"].includes(requestedSortOrder ?? "")
    ? requestedSortOrder
    : DEFAULT_SORT_ORDER;

  return {
    page,
    limit,
    search: searchParams.get("search") ?? "",
    sortBy,
    sortOrder,
  };
}

export function parsePositiveParam(value, fallback) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
