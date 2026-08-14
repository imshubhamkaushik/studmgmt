import client from "./client";

export const listTeacherAssignments = (params = {}) =>
  client.get("/teacher-classroom-assignments", { params }).then((r) => r.data);

export const createTeacherAssignment = (data) =>
  client.post("/teacher-classroom-assignments", data).then((r) => r.data);

export const revokeTeacherAssignment = (id) =>
  client
    .patch(`/teacher-classroom-assignments/${id}/revoke`)
    .then((r) => r.data);
