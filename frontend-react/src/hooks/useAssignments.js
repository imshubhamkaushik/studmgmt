import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAssignments, createAssignment } from "../api/assignments";

export function useAssignments(params) {
  return useQuery({
    queryKey: ["assignments", "list", params],
    queryFn: () => getAssignments(params),
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAssignment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments", "list"] }),
  });
}
