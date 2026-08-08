"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AccountForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError("");
    const response = await fetch(
      `/api/auth/${mode === "login" ? "login" : "register"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
    );
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Please try again.");
      setStatus("idle");
      return;
    }
    router.push("/lawyer/dashboard");
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Link className="brand" href="/">
          <span className="brand-mark">M</span>
          <span>meet</span>
        </Link>
        <div>
          <p className="section-kicker">Lawyer workspace</p>
          <h1>
            Your practice,
            <br />
            in one place.
          </h1>
          <p>
            Build a profile clients understand, publish useful legal insights
            and keep every detail of your practice current.
          </p>
          <ul>
            <li>Private profile dashboard</li>
            <li>Draft and publish articles</li>
            <li>Update availability, fees and expertise anytime</li>
          </ul>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              className={mode === "register" ? "active" : ""}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Create account
            </button>
            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Sign in
            </button>
          </div>
          <p className="section-kicker">
            {mode === "register" ? "Join Meet as a lawyer" : "Welcome back"}
          </p>
          <h2>
            {mode === "register"
              ? "Create your workspace"
              : "Sign in to your practice"}
          </h2>
          <p className="auth-copy">
            {mode === "register"
              ? "Start with the essentials, then design your public profile at your own pace."
              : "Manage your public profile, articles and visibility."}
          </p>
          <form onSubmit={submit}>
            {mode === "register" && (
              <label>
                Full name
                <input
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ana Martins"
                />
              </label>
            )}
            <label>
              Professional email
              <input
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ana@lawfirm.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={8}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 8 characters"
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" disabled={status === "loading"}>
              {status === "loading"
                ? "Please wait…"
                : mode === "register"
                  ? "Create lawyer account"
                  : "Sign in"}
              <span>→</span>
            </button>
          </form>
          <Link className="back-home" href="/">
            ← Back to Meet
          </Link>
        </div>
      </section>
    </main>
  );
}
