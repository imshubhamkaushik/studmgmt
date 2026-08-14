import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "../api/dashboard";
import { queryKeys } from "../api/queryKeys";

export const useDashboardStats = (range = "all") =>
  useQuery({
    queryKey: [...queryKeys.dashboard.stats(), range],
    queryFn: () => getDashboardStats({ range }),
  });
