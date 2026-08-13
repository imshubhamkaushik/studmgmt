import { useQuery } from "@tanstack/react-query";

import { getDashboardStats } from "../api/dashboard";

export const dashboardKeys = {
  all: ["dashboard"],

  stats: () => [...dashboardKeys.all, "stats"],
};

export const useDashboardStats = () =>
  useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: getDashboardStats,
  });
