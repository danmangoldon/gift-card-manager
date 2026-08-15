"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Login failed. Please check your email and password.");
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark"><LockKeyhole size={25} /></div>
        <p className="eyebrow">INTERNAL TOOL</p>
        <h1>Gift Card Manager</h1>
        <p className="muted">
          Sign in to view and manage gift card codes.
        </p>

        <form onSubmit={login} className="form-stack">
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

          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </label>

          {error && <div className="error-box">{error}</div>}

          <button className="primary full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
