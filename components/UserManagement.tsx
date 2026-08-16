"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, Trash2, UserPlus } from "lucide-react";

type Role = "admin" | "user";

type ManagedUser = {
  id: string;
  email: string;
  role: Role;
  emailConfirmedAt: string | null;
  invitedAt: string | null;
  lastSignInAt: string | null;
  isCurrentUser: boolean;
};

export default function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Unable to load users.");
      setLoading(false);
      return;
    }

    setUsers(data.users ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;

    return users.filter((user) =>
      [user.email, user.role, user.emailConfirmedAt ? "active" : "invited"]
        .some((value) => value.toLowerCase().includes(q))
    );
  }, [users, query]);

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(data.error || "Unable to invite user.");
      return;
    }

    setEmail("");
    setRole("user");
    setMessage("Invitation sent.");
    await loadUsers();
  }

  async function changeRole(id: string, nextRole: Role) {
    setError("");
    setMessage("");

    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role: nextRole }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Unable to update role.");
      return;
    }

    setMessage("Role updated.");
    await loadUsers();
  }

  async function deleteUser(user: ManagedUser) {
    if (
      !window.confirm(
        `Remove access for ${user.email}?\\n\\nThe user will no longer be able to sign in.`
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    const response = await fetch(`/api/admin/users?id=${encodeURIComponent(user.id)}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Unable to remove user.");
      return;
    }

    setMessage("User removed.");
    await loadUsers();
  }

  return (
    <main className="app-shell">
      <div className="admin-page-header">
        <a className="back-button" href="/">
          <ArrowLeft size={16} /> Gift Card Manager
        </a>

        <div>
          <p className="eyebrow">ADMIN</p>
          <h1>User Management</h1>
          <p className="muted">
            Invite users and control who has administrative access.
          </p>
        </div>
      </div>

      <section className="permissions-grid">
        <article className="permission-card">
          <strong>User</strong>
          <span>Can view and copy available gift cards and mark them as used.</span>
          <small>No upload, edit, delete, restore, audit log or user administration.</small>
        </article>

        <article className="permission-card">
          <strong>Admin</strong>
          <span>Full gift card management.</span>
          <small>Can upload, edit, delete, restore, view the audit log and manage users.</small>
        </article>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="eyebrow">INVITE</p>
            <h2>Add user</h2>
          </div>
        </div>

        <form className="invite-form" onSubmit={inviteUser}>
          <label>
            Email
            <input
              type="email"
              required
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label>
            Access
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <button className="primary invite-button" disabled={saving}>
            <UserPlus size={17} />
            {saving ? "Sending…" : "Send invitation"}
          </button>
        </form>

        {message && <div className="notice admin-message">{message}</div>}
        {error && <div className="error-box admin-message">{error}</div>}
      </section>

      <div className="audit-toolbar user-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users…"
          />
        </div>
        <span className="result-count">{filtered.length} users</span>
      </div>

      <section className="table-card">
        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Last sign in</th>
                <th>Access</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>Loading users…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty compact-empty">
                      <strong>No users found</strong>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.email}</strong>
                      {user.isCurrentUser && <small>You</small>}
                    </td>
                    <td>
                      <span className={`status ${user.emailConfirmedAt ? "available" : "used"}`}>
                        {user.emailConfirmedAt ? "Active" : "Invited"}
                      </span>
                    </td>
                    <td>
                      {user.lastSignInAt
                        ? new Date(user.lastSignInAt).toLocaleString()
                        : "—"}
                    </td>
                    <td>
                      <select
                        className="role-select"
                        value={user.role}
                        disabled={user.isCurrentUser}
                        onChange={(e) => changeRole(user.id, e.target.value as Role)}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="actions">
                      <button
                        className="icon-action danger-action"
                        title="Remove user"
                        disabled={user.isCurrentUser}
                        onClick={() => deleteUser(user)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
