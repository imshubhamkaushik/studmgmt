import { describe, expect, it } from "vitest";
import { naturalCompare, sortByKeyNatural } from "../naturalSort";

describe("naturalCompare", () => {
  it("orders purely numeric strings numerically, not lexicographically", () => {
    const values = ["1", "11", "2", "10"];
    expect([...values].sort(naturalCompare)).toEqual(["1", "2", "10", "11"]);
  });

  it("falls back to alphabetical ordering for non-numeric labels", () => {
    const values = ["Nursery", "IX", "KG"];
    expect([...values].sort(naturalCompare)).toEqual(["IX", "KG", "Nursery"]);
  });
});

describe("sortByKeyNatural", () => {
  it("sorts an array of objects by a numeric-ish key without mutating the input", () => {
    const input = [{ class: "11", count: 1 }, { class: "2", count: 3 }, { class: "1", count: 3 }];
    const sorted = sortByKeyNatural(input, "class");
    expect(sorted.map((item) => item.class)).toEqual(["1", "2", "11"]);
    expect(input.map((item) => item.class)).toEqual(["11", "2", "1"]);
  });
});
