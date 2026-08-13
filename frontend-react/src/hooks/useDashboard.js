import { useQuery } from "@tanstack/react-query";

import { getDashboardStats } from "../api/dashboard";
import { queryKeys } from "../api/queryKeys";

export const useDashboardStats = () =>
  useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: getDashboardStats,
  });
