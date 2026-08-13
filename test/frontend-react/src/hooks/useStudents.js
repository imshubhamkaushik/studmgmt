import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createStudent,
  deleteStudent,
  getStudentById,
  getStudents,
  updateStudent,
} from "../api/students";

export const studentKeys = {
  all: ["students"],

  lists: () => [...studentKeys.all, "list"],

  list: (params) => [...studentKeys.lists(), params],

  details: () => [...studentKeys.all, "detail"],

  detail: (id) => [...studentKeys.details(), id],
};

export const useStudents = (params) =>
  useQuery({
    queryKey: studentKeys.list(params),
    queryFn: () => getStudents(params),
    placeholderData: (previousData) => previousData,
  });

export const useStudent = (id) =>
  useQuery({
    queryKey: studentKeys.detail(id),
    queryFn: () => getStudentById(id),
    enabled: Boolean(id),
  });

export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStudent,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: studentKeys.all,
      });
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, studentData }) => updateStudent(id, studentData),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: studentKeys.all,
      });

      queryClient.invalidateQueries({
        queryKey: studentKeys.detail(variables.id),
      });
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteStudent,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: studentKeys.all,
      });
    },
  });
};
