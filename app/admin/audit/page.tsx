import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AuditPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("role").single();

  if (profile?.role !== "admin") redirect("/");

  const { data: logs } = await supabase
    .from("gift_card_audit_log")
    .select("id, gift_card_id, action, actor_email, created_at, old_data, new_data")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <main className="app-shell">
      <div style={{ marginBottom: 24 }}>
        <Link href="/">← Back to Gift Card Manager</Link>
      </div>
      <p className="eyebrow">ADMIN</p>
      <h1>Audit Log</h1>
      <p className="muted">Database-generated history of gift card changes. The application cannot edit or delete these records.</p>

      <section className="table-card" style={{ marginTop: 24 }}>
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
              {(logs ?? []).map((log: any) => {
                const data = log.new_data ?? log.old_data ?? {};
                return (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td><span className="status used">{log.action}</span></td>
                    <td>{log.actor_email || "—"}</td>
                    <td><code>{data.code || "—"}</code></td>
                    <td>{data.recipient || "—"}</td>
                    <td>{data.status || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
