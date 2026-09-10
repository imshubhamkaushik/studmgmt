export const portalQueryKeys = {
  profile: () => ["portal", "profile"],
  attendance: (month) => ["portal", "attendance", month ?? "recent"],
  assignments: () => ["portal", "assignments"],
  notifications: {
    list: () => ["portal", "notifications", "list"],
    unreadCount: () => ["portal", "notifications", "unreadCount"],
  },
};
