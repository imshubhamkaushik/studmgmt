// Plain string sort puts "11" before "2" because it compares character by
// character ("1" < "2"). Class/section names are frequently pure numbers
// stored as strings, so the dashboard's "Students by Class" chart needs a
// sort that treats a numeric label as a number — "10" and "2" and "IX" all
// need to end up in a sensible order together.
export function naturalCompare(a, b) {
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortByKeyNatural(items, key) {
  return [...items].sort((a, b) => naturalCompare(a[key], b[key]));
}
