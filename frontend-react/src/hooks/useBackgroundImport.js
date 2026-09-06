import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestCsvUploadUrl, uploadCsvFile, getImportJobStatus } from "../api/imports";
import { queryKeys } from "../api/queryKeys";

const TERMINAL_STATUSES = new Set(["completed", "failed"]);

// Request a presigned URL, then PUT the file to S3. Resolves with the
// jobId, which the caller then hands to useImportJobStatus to watch.
export function useStartBackgroundImport() {
  return useMutation({
    mutationFn: async (file) => {
      const { uploadUrl, jobId } = await requestCsvUploadUrl();
      await uploadCsvFile(uploadUrl, file);
      return jobId;
    },
  });
}

// Polls every 2.5s while the job is in flight, and stops on its own once
// the job reaches a terminal status — no manual clearInterval bookkeeping,
// react-query's refetchInterval handles it.
export function useImportJobStatus(jobId) {
  return useQuery({
    queryKey: queryKeys.importJobs.detail(jobId),
    queryFn: () => getImportJobStatus(jobId),
    enabled: Boolean(jobId),
    // query.state.data is the full { success, data } envelope apiClient
    // returns — the actual status is nested at .data.status, not on the
    // envelope itself. Checking the envelope's own (always-undefined)
    // .status here would mean this condition never matches and polling
    // never stops, even once the job finishes.
    refetchInterval: (query) => (TERMINAL_STATUSES.has(query.state.data?.data?.status) ? false : 2500),
  });
}

export function useInvalidateStudentsAfterImport() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };
}
