import apiClient from "./client";

export const getMyNotifications = (params = {}) => apiClient.get("/notifications/me", { params });

export const getUnreadCount = () => apiClient.get("/notifications/me/unread-count");

export const markNotificationRead = (id) => apiClient.patch(`/notifications/${id}/read`);

export const markAllNotificationsRead = () => apiClient.patch("/notifications/read-all");

export const createNotification = (payload) => apiClient.post("/notifications", payload);
