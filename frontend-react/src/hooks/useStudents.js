import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createStudent,
  deleteStudent,
  getStudentById,
  getStudents,
  updateStudent,
} from "../api/students";
import { queryKeys } from "../api/queryKeys";

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

export const useStudent = (id) =>
  useQuery({
    queryKey: queryKeys.students.detail(id),
    queryFn: () => getStudentById(id),
    enabled: Boolean(id),
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
