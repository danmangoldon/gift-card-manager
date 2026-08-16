"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const redirectTo =
  "https://gift-card-manager-sooty.vercel.app/auth/callback?next=/reset-password";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Password reset link sent. Please check your email.");
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark"><Mail size={25} /></div>
        <p className="eyebrow">INTERNAL TOOL</p>
        <h1>Reset password</h1>
        <p className="muted">
          We will send a password reset link to your email address.
        </p>

        <form onSubmit={sendReset} className="form-stack">
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />
          </label>

          {message && <div className="notice">{message}</div>}
          {error && <div className="error-box">{error}</div>}

          <div className="login-actions">
            <button className="primary full" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <a className="login-forgot" href="/login">
              Back to sign in
            </a>
          </div>
        </form>
      </section>
    </main>
  );
}
