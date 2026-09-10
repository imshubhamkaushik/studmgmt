import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/periodAttendance";

export const periodAttendanceKeys = {
  roster: (timetableEntryId, date) => ["periodAttendance", "roster", timetableEntryId, date],
};

export function usePeriodRoster(timetableEntryId, date) {
  return useQuery({
    queryKey: periodAttendanceKeys.roster(timetableEntryId, date),
    queryFn: () => api.getPeriodRoster(timetableEntryId, date),
    enabled: Boolean(timetableEntryId && date),
    retry: false,
  });
}

export function useMarkPeriodAttendance(timetableEntryId, date) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.markPeriodAttendance(timetableEntryId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: periodAttendanceKeys.roster(timetableEntryId, date) });
    },
  });
}
