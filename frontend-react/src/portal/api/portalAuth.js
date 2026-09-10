import portalClient from "./portalClient";

export const login = (payload) => portalClient.post("/auth/login", payload);
export const logout = () => portalClient.post("/auth/logout");
export const getMe = () => portalClient.get("/auth/me");
export const changePassword = (payload) => portalClient.patch("/auth/change-password", payload);
