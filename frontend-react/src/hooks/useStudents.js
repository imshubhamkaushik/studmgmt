import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createStudent,
  deleteStudent,
  getStudentById,
  getStudents,
  updateStudent,
  getStudentFilterOptions,
  importStudents,
  restoreStudent,
  bulkUpdateStudents,
} from "../api/students";
import { queryKeys } from "../api/queryKeys";
import { isValidObjectId } from "../utils/objectId";

const invalidateStudentData = async (queryClient) => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.students.all,
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.all,
    }),
  ]);
};

export const useStudents = (params) =>
  useQuery({
    queryKey: queryKeys.students.list(params),
    queryFn: () => getStudents(params),
    placeholderData: (previousData) => previousData,
  });

export const useStudentFilterOptions = () =>
  useQuery({
    queryKey: [...queryKeys.students.all, "filter-options"],
    queryFn: getStudentFilterOptions,
    staleTime: 60_000,
  });

export const useImportStudents = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importStudents,
    onSuccess: () => invalidateStudentData(queryClient),
  });
};

export const useStudent = (id) =>
  useQuery({
    queryKey: queryKeys.students.detail(id),
    queryFn: () => getStudentById(id),
    enabled: isValidObjectId(id),
  });

export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStudent,
    onSuccess: () => invalidateStudentData(queryClient),
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, studentData }) => updateStudent(id, studentData),
    onSuccess: (_, variables) => {
      return Promise.all([
        invalidateStudentData(queryClient),
        queryClient.invalidateQueries({
          queryKey: queryKeys.students.detail(variables.id),
        }),
      ]);
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => invalidateStudentData(queryClient),
  });
};

export const useRestoreStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreStudent,
    onSuccess: () => invalidateStudentData(queryClient),
  });
};

export const useBulkUpdateStudents = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkUpdateStudents,
    onSuccess: () => invalidateStudentData(queryClient),
  });
};
