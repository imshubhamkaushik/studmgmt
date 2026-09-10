import portalClient from "./portalClient";

export const getMyNotifications = (params = {}) => portalClient.get("/notifications/me", { params });
export const getUnreadCount = () => portalClient.get("/notifications/me/unread-count");
export const markNotificationRead = (id) => portalClient.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => portalClient.patch("/notifications/read-all");
