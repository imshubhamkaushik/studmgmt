import apiClient from "./client";
export const getClassrooms=(params={})=>apiClient.get("/classrooms",{params});
export const createClassroom=(data)=>apiClient.post("/classrooms",data);
