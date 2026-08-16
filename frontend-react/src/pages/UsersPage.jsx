import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserPlus, ShieldCheck, LockKeyholeOpen, Users as UsersIcon } from "lucide-react";
import * as api from "../api/auth";
import { useToast } from "../hooks/useToast";
import { getApiErrorMessage } from "../utils/apiErrorMessage";
import Avatar from "../components/common/Avatar";
import ErrorState from "../components/common/ErrorState";
import EmptyState from "../components/common/EmptyState";

const ROLE_LABELS = { admin: "Admin", staff: "Staff", teacher: "Teacher" };

function isLocked(user) {
  return Boolean(user.lockedUntil && new Date(user.lockedUntil) > new Date());
}

export default function UsersPage() {
  const qc = useQueryClient();
  const toast = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: api.getUsers,
  });

  const create = useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.show("User created.");
      setForm({ name: "", email: "", password: "", role: "staff" });
    },
    onError: (err) => toast.show(getApiErrorMessage(err, "Unable to create user."), "error"),
  });

  const unlock = useMutation({
    mutationFn: (id) => api.updateUser(id, { unlock: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.show("Account unlocked.");
    },
    onError: (err) => toast.show(getApiErrorMessage(err, "Unable to unlock this account."), "error"),
  });

  const users = data?.data || [];

  return (
    <div className="dashboard-page">
      <section className="form-card">
        <div className="section-heading">
          <div>
            <h2>Add a User</h2>
            <p>Administrators manage access. Teachers can mark attendance; staff can manage student records.</p>
          </div>
        </div>

        <form
          className="user-form"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate(form);
          }}
        >
          <div>
            <label className="form-field-label" htmlFor="user-name">Name</label>
            <input
              id="user-name"
              placeholder="Full name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-field-label" htmlFor="user-email">Email</label>
            <input
              id="user-email"
              type="email"
              placeholder="name@school.edu"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-field-label" htmlFor="user-password">Password</label>
            <input
              id="user-password"
              type="password"
              placeholder="Min 12 characters"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              minLength="12"
              required
            />
          </div>
          <div>
            <label className="form-field-label" htmlFor="user-role">Role</label>
            <select
              id="user-role"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
            >
              <option value="staff">Staff</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="form-field-label" htmlFor="user-submit">&nbsp;</label>
            <button id="user-submit" type="submit" className="button button-primary" disabled={create.isPending} style={{ width: "100%" }}>
              <UserPlus size={15} aria-hidden="true" />
              {create.isPending ? "Adding…" : "Add User"}
            </button>
          </div>
        </form>
      </section>

      <section className="dashboard-card" style={{ marginTop: 18 }}>
        <div className="section-heading">
          <div>
            <h2>All Users</h2>
            <p>{users.length} account{users.length === 1 ? "" : "s"} with workspace access.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="skeleton-rows">
            {Array.from({ length: 4 }).map((_, i) => <div className="skeleton" key={i} />)}
          </div>
        ) : error ? (
          <ErrorState message={getApiErrorMessage(error, "Unable to load users.")} onRetry={refetch} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No users yet"
            message="Add your first administrator, staff member, or teacher above."
          />
        ) : (
          <div className="table-wrapper">
            <table className="student-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <span className="student-name-link" style={{ cursor: "default" }}>
                        <Avatar name={user.name} size="sm" />
                        <span>
                          <strong style={{ display: "block" }}>{user.name}</strong>
                          <span style={{ color: "var(--muted-2)", fontWeight: 500, fontSize: 12 }}>{user.email}</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className="status-badge" style={{ background: "var(--indigo-soft)", color: "var(--indigo)" }}>
                        <ShieldCheck size={11} style={{ marginRight: 4 }} aria-hidden="true" />
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span className={`status-badge status-${user.isActive ? "active" : "inactive"}`}>
                          <span className="status-badge-dot" aria-hidden="true" />
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                        {isLocked(user) && (
                          <span className="status-badge" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
                            Locked
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</td>
                    <td>
                      {isLocked(user) && (
                        <button
                          type="button"
                          className="button button-small button-secondary"
                          onClick={() => unlock.mutate(user._id)}
                          disabled={unlock.isPending}
                        >
                          <LockKeyholeOpen size={13} aria-hidden="true" />
                          Unlock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
