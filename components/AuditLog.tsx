"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";

export type AuditEntry = {
  id: number;
  action: string;
  actor_email: string | null;
  created_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
};

export default function AuditLog({ logs }: { logs: AuditEntry[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logs;

    return logs.filter((log) => {
      const data = (log.new_data ?? log.old_data ?? {}) as Record<string, unknown>;
      const values = [
        log.action,
        log.actor_email ?? "",
        String(data.code ?? ""),
        String(data.recipient ?? ""),
        String(data.status ?? ""),
        String(data.batch_label ?? ""),
        String(data.note ?? ""),
        new Date(log.created_at).toLocaleString(),
      ];

      return values.some((value) => value.toLowerCase().includes(q));
    });
  }, [logs, query]);

  return (
    <main className="app-shell">
      <div className="admin-page-header">
        <a className="back-button" href="/">
          <ArrowLeft size={16} /> Gift Card Manager
        </a>

        <div>
          <p className="eyebrow">ADMIN</p>
          <h1>Audit Log</h1>
          <p className="muted">
            Database-generated history of gift card changes. The application cannot edit or delete these records.
          </p>
        </div>
      </div>

      <div className="audit-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search user, code, recipient, action, status…"
          />
        </div>
        <span className="result-count">
          {filtered.length} of {logs.length} entries
        </span>
      </div>

      <section className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>User</th>
                <th>Code</th>
                <th>Recipient</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty compact-empty">
                      <strong>No matching audit entries</strong>
                      <span>Try another search term.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const data = (log.new_data ?? log.old_data ?? {}) as Record<string, unknown>;
                  return (
                    <tr key={log.id}>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                      <td><span className="status used">{log.action}</span></td>
                      <td>{log.actor_email || "—"}</td>
                      <td><code>{String(data.code ?? "—")}</code></td>
                      <td>{String(data.recipient ?? "—")}</td>
                      <td>{String(data.status ?? "—")}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
