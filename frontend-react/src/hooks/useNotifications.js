import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../api/notifications";
import { queryKeys } from "../api/queryKeys";

// Polls regardless of whether the panel is open — this is what puts a
// number on the bell icon without the user having to click it first.
// 30s is frequent enough to feel current without hammering the API from
// every open tab.
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: getUnreadCount,
    refetchInterval: 30_000,
    select: (response) => response.data.count,
  });
}

// Only fetches once the panel is actually open (see enabled) — no reason
// to pull the full list before the user has asked to see it.
export function useMyNotifications(open) {
  return useQuery({
    queryKey: queryKeys.notifications.list({}),
    queryFn: () => getMyNotifications(),
    enabled: open,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list({}) });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list({}) });
    },
  });
}
