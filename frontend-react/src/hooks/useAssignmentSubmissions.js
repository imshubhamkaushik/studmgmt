import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listSubmissions,
  requestSubmissionUploadUrl,
  uploadSubmissionFile,
  gradeSubmission,
} from "../api/assignmentSubmissions";

const submissionsKey = (assignmentId) => ["assignmentSubmissions", "list", assignmentId];

export function useSubmissions(assignmentId, enabled = true) {
  return useQuery({
    queryKey: submissionsKey(assignmentId),
    queryFn: () => listSubmissions(assignmentId),
    enabled: Boolean(assignmentId) && enabled,
  });
}

// One mutation covering the whole staff-side upload flow: ask for a
// presigned POST, then actually upload the file to it. The submission
// won't show as "submitted" immediately after this resolves — validation
// happens asynchronously (process-submission Lambda → SQS →
// submission-consumer worker), so it sits at "pending_upload" until that
// finishes. Refreshing the list picks up the eventual status.
export function useUploadSubmission(assignmentId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, file }) => {
      const { data } = await requestSubmissionUploadUrl(assignmentId, {
        studentId,
        originalName: file.name,
        mimeType: file.type,
      });
      await uploadSubmissionFile({ uploadUrl: data.uploadUrl, fields: data.fields, file });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: submissionsKey(assignmentId) }),
  });
}

export function useGradeSubmission(assignmentId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => gradeSubmission(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: submissionsKey(assignmentId) }),
  });
}
