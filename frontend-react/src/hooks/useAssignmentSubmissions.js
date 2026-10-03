import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listSubmissions, uploadSubmission, gradeSubmission } from "../api/assignmentSubmissions";

const submissionsKey = (assignmentId) => ["assignmentSubmissions", "list", assignmentId];

export function useSubmissions(assignmentId, enabled = true) {
  return useQuery({
    queryKey: submissionsKey(assignmentId),
    queryFn: () => listSubmissions(assignmentId),
    enabled: Boolean(assignmentId) && enabled,
  });
}

// Uploads a file as a student's submission (recorded by staff on their
// behalf). The submission is validated and stored in the same request.
export function useUploadSubmission(assignmentId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, file }) => uploadSubmission(assignmentId, { studentId, file }),
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
