import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as api from "../api/auth";
import { useToast } from "../components/common/ToastProvider";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

export default function UsersPage() {
  const qc = useQueryClient();
  const toast = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: api.getUsers,
  });

  const create = useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created.");
      setForm({
        name: "",
        email: "",
        password: "",
        role: "staff",
      });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const users = data?.data || [];

  let content;

  if (isLoading) {
    content = <p>Loading users…</p>;
  } else if (error) {
    content = <p className="inline-error">{getApiErrorMessage(error)}</p>;
  } else {
    content = (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last login</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.isActive ? "Active" : "Inactive"}</td>
                <td>
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString()
                    : "Never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <h2>Users & Roles</h2>
          <p>
            Administrators manage access. Teachers can mark attendance; staff
            can manage student records.
          </p>
        </div>
      </div>

      <form
        className="user-form"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate(form);
        }}
      >
        <input
          placeholder="Name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
        />

        <input
          type="password"
          placeholder="Password (min 12 characters)"
          value={form.password}
          onChange={(event) =>
            setForm({ ...form, password: event.target.value })
          }
          minLength="12"
          required
        />

        <select
          value={form.role}
          onChange={(event) => setForm({ ...form, role: event.target.value })}
        >
          <option value="staff">Staff</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>

        <button type="submit" disabled={create.isPending}>
          Add user
        </button>
      </form>

      {content}
    </section>
  );
}
