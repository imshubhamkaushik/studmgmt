import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/attendance";
import { queryKeys } from "../api/queryKeys";

export const useAttendance = (params, enabled = true) =>
  useQuery({
    queryKey: queryKeys.attendance.list(params),
    queryFn: () => api.getAttendance(params),
    enabled,
  });

export const useAttendanceSummary = (params) =>
  useQuery({
    queryKey: queryKeys.attendance.summary(params),
    queryFn: () => api.getAttendanceSummary(params),
  });

export const useMarkBulkAttendance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markBulkAttendance,
    retry: false,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.attendance.all }),
  });
};
