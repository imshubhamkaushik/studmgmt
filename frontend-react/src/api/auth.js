import apiClient from "./client.js";

export const login = (payload) => apiClient.post("/auth/login", payload);

export const logout = () => apiClient.post("/auth/logout");

export const getMe = () => apiClient.get("/auth/me");

export const getUsers = () => apiClient.get("/auth/users");

export const createUser = (payload) => apiClient.post("/auth/users", payload);

export const updateUser = (id, payload) =>
  apiClient.patch(`/auth/users/${id}`, payload);
