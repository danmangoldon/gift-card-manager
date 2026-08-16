import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AuditLog, { type AuditEntry } from "@/components/AuditLog";

export default async function AuditPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const { data: logs } = await supabase
    .from("gift_card_audit_log")
    .select("id, gift_card_id, action, actor_email, created_at, old_data, new_data")
    .order("created_at", { ascending: false })
    .limit(1000);

  return <AuditLog logs={(logs ?? []) as AuditEntry[]} />;
}
