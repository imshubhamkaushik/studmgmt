import { useEffect, useState } from "react";
import {
    listTeacherAssignments,
    createTeacherAssignment,
    revokeTeacherAssignment,
} from "../api/teacherAssignments";
import { getClassrooms } from "../api/classrooms.js";
import { getUsers } from "../api/auth";

export default function TeacherAssignmentsPage() {
    const [rows, setRows] = useState([]),
        [teachers, setTeachers] = useState([]),
        [rooms, setRooms] = useState([]),
        [teacher, setTeacher] = useState(""),
        [classroom, setClassroom] = useState(""),
        [error, setError] = useState("");
    const load = async () => {
        try {
            const [a, u, c] = await Promise.all([
                listTeacherAssignments(),
                getUsers(),
                getClassrooms(),
            ]);
            setRows(a.data || a);
            setTeachers(
                (u.data || u).filter((x) => x.role === "teacher" && x.isActive),
            );
            setRooms(c.data || c);
        } catch (e) {
            setError(e.response?.data?.message || "Unable to load assignments.");
        }
    };
    useEffect(() => {
        load();
    }, []);
    const submit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await createTeacherAssignment({
                teacherId: teacher,
                classroomId: classroom,
            });
            setTeacher("");
            setClassroom("");
            load();
        } catch (e) {
            setError(e.response?.data?.message || "Assignment failed.");
        }
    };
    return (
        <div className="page">
            <h1>Teacher Classroom Assignments</h1>
            {error && <p>{error}</p>}
            <form onSubmit={submit}>
                <select
                    value={teacher}
                    onChange={(e) => setTeacher(e.target.value)}
                    required
                >
                    <option value="">Select teacher</option>
                    {teachers.map((t) => (
                        <option key={t._id} value={t._id}>
                            {t.name} ({t.email})
                        </option>
                    ))}
                </select>
                <select
                    value={classroom}
                    onChange={(e) => setClassroom(e.target.value)}
                    required
                >
                    <option value="">Select classroom</option>
                    {rooms.map((c) => (
                        <option key={c._id} value={c._id}>
                            {c.className}-{c.section}
                        </option>
                    ))}
                </select>
                <button>Assign</button>
            </form>
            <table>
                <thead>
                    <tr>
                        <th>Teacher</th>
                        <th>Classroom</th>
                        <th>Status</th>
                        <th />
                    </tr>
                </thead>
                <tbody>
                    {rows.map((a) => (
                        <tr key={a._id}>
                            <td>{a.teacher?.name || a.teacher?.email || a.teacher}</td>
                            <td>
                                {a.classroom?.className}-{a.classroom?.section}
                            </td>
                            <td>{a.isActive ? "Active" : "Revoked"}</td>
                            <td>
                                {a.isActive && (
                                    <button
                                        onClick={async () => {
                                            await revokeTeacherAssignment(a._id);
                                            load();
                                        }}
                                    >
                                        Revoke
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
