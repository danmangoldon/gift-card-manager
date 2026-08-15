"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MailKey } from "lucide-react";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark"><MailKey size={25} /></div>
        <p className="eyebrow">INTERNAL TOOL</p>
        <h1>Reset password</h1>
        <p className="muted">We will send a password reset link to your email address.</p>

        {sent ? (
          <>
            <div className="notice">If the account exists, a reset email has been sent.</div>
            <a className="ghost full" href="/login">Back to sign in</a>
          </>
        ) : (
          <form onSubmit={sendReset} className="form-stack">
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@company.com"
              />
            </label>
            {error && <div className="error-box">{error}</div>}
            <button className="primary full" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <a className="link-btn centered-link" href="/login">Back to sign in</a>
          </form>
        )}
      </section>
    </main>
  );
}
