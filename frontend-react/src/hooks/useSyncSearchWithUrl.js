import { useEffect } from "react";

export default function useSyncSearchWithUrl({
  urlSearch,
  debouncedSearch,
  setSearchInput,
  setSearchParams,
}) {
  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch, setSearchInput]);

  useEffect(() => {
    const normalizedSearch = debouncedSearch.trim();

    if (normalizedSearch === urlSearch) {
      return;
    }

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);

        if (normalizedSearch) {
          next.set("search", normalizedSearch);
        } else {
          next.delete("search");
        }

        next.delete("page");

        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, urlSearch, setSearchParams]);
}
