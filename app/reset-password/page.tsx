"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { KeyRound } from "lucide-react";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session) {
        setError(
          "This password reset link is invalid or has expired. Please request a new one."
        );
        return;
      }

      setReady(true);
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Password updated successfully. You can now sign in.");
    setPassword("");
    setConfirmPassword("");

    await supabase.auth.signOut();

    window.setTimeout(() => {
      window.location.href = "/login";
    }, 1400);
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark"><KeyRound size={25} /></div>
        <p className="eyebrow">INTERNAL TOOL</p>
        <h1>Choose a new password</h1>
        <p className="muted">
          Enter your new password below.
        </p>

        <form onSubmit={updatePassword} className="form-stack">
          <label>
            New password
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!ready || loading}
              required
              placeholder="At least 8 characters"
            />
          </label>

          <label>
            Confirm password
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={!ready || loading}
              required
              placeholder="Repeat new password"
            />
          </label>

          {message && <div className="notice">{message}</div>}
          {error && <div className="error-box">{error}</div>}

          <div className="login-actions">
            <button
              className="primary full"
              disabled={!ready || loading}
            >
              {loading ? "Updating…" : "Update password"}
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
