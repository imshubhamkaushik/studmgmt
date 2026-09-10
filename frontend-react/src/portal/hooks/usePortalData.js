import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as portalStudentApi from "../api/portalStudent";
import * as portalNotificationsApi from "../api/portalNotifications";
import { portalQueryKeys } from "../api/portalQueryKeys";

export function usePortalProfile() {
  return useQuery({
    queryKey: portalQueryKeys.profile(),
    queryFn: portalStudentApi.getMyProfile,
    select: (response) => response.data,
  });
}

export function usePortalAttendance(month) {
  return useQuery({
    queryKey: portalQueryKeys.attendance(month),
    queryFn: () => portalStudentApi.getMyAttendance(month),
    select: (response) => response.data,
  });
}

export function usePortalAssignments() {
  return useQuery({
    queryKey: portalQueryKeys.assignments(),
    queryFn: portalStudentApi.getMyAssignments,
    select: (response) => response.data,
  });
}

export function usePortalUnreadCount() {
  return useQuery({
    queryKey: portalQueryKeys.notifications.unreadCount(),
    queryFn: portalNotificationsApi.getUnreadCount,
    refetchInterval: 30_000,
    select: (response) => response.data.count,
  });
}

export function usePortalNotifications(enabled) {
  return useQuery({
    queryKey: portalQueryKeys.notifications.list(),
    queryFn: () => portalNotificationsApi.getMyNotifications(),
    enabled,
    select: (response) => response.data,
  });
}

export function useMarkPortalNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: portalNotificationsApi.markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portalQueryKeys.notifications.unreadCount() });
      queryClient.invalidateQueries({ queryKey: portalQueryKeys.notifications.list() });
    },
  });
}

export function useMarkAllPortalNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: portalNotificationsApi.markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portalQueryKeys.notifications.unreadCount() });
      queryClient.invalidateQueries({ queryKey: portalQueryKeys.notifications.list() });
    },
  });
}
