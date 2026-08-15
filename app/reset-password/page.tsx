"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { KeyRound } from "lucide-react";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (mounted && data.session) setReady(true);
    }

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });

    const timer = window.setTimeout(() => {
      if (mounted) setReady((current) => current);
    }, 1500);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 10) {
      setError("Please use a password with at least 10 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
    await supabase.auth.signOut();
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark"><KeyRound size={25} /></div>
        <p className="eyebrow">INTERNAL TOOL</p>
        <h1>Set new password</h1>

        {success ? (
          <>
            <p className="muted">Your password has been updated successfully.</p>
            <a className="primary full" href="/login">Return to sign in</a>
          </>
        ) : ready ? (
          <form onSubmit={updatePassword} className="form-stack">
            <label>
              New password
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="At least 10 characters"
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repeat password"
              />
            </label>
            {error && <div className="error-box">{error}</div>}
            <button className="primary full" disabled={loading}>
              {loading ? "Saving…" : "Save new password"}
            </button>
          </form>
        ) : (
          <>
            <p className="muted">
              This recovery link is invalid, expired, or has already been used.
            </p>
            <a className="primary full" href="/forgot-password">Request a new link</a>
          </>
        )}
      </section>
    </main>
  );
}
