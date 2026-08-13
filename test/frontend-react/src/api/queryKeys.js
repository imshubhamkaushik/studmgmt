export const queryKeys = {
  students: {
    all: ["students"],

    lists: () => ["students", "list"],

    list: (params) => ["students", "list", params],

    details: () => ["students", "detail"],

    detail: (id) => ["students", "detail", id],
  },

  dashboard: {
    all: ["dashboard"],

    stats: () => ["dashboard", "stats"],
  },
};
