export const queryKeys = {
  students: {
    all: ["students"],

    lists: () => ["students", "list"],

    list: (params) => ["students", "list", params],

    details: () => ["students", "detail"],

    detail: (id) => ["students", "detail", id],
  },

  attendance: {
    all: ["attendance"],
    list: (params) => ["attendance", "list", params],
    summary: (params) => ["attendance", "summary", params],
  },

  dashboard: {
    all: ["dashboard"],

    stats: () => ["dashboard", "stats"],
  },
};
