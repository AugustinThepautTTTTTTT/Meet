"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ClientCase = {
  id: string;
  brief: {
    practice?: string;
    summary?: string;
    dispute?: string;
    jurisdiction?: string;
    urgency?: string;
    deadline?: string;
    desiredOutcome?: string;
    parties?: string;
    language?: string;
    meetingFormat?: string;
    keyFacts?: string[];
    missingInformation?: string[];
    conversation?: Array<{ role: "client" | "assistant"; content: string }>;
  };
  status: string;
  selected_lawyer_slug: string;
  selected_lawyer_name: string;
  meeting_time: string;
  meeting_start?: string;
  meeting_url?: string;
  payment_status?: string;
  payment_amount_cents?: number;
  payment_currency?: string;
  stripe_checkout_url?: string;
  matter_id?: string;
  created_at: string;
  updated_at: string;
};

const statusCopy: Record<string, { label: string; title: string; detail: string }> = {
  payment_pending: {
    label: "Payment required",
    title: "Pay to confirm the approved meeting",
    detail: "The lawyer approved your request. Secure payment is the final step before confirmation.",
  },
  meeting_requested: {
    label: "Awaiting lawyer",
    title: "Your request is with the lawyer",
    detail: "The lawyer is reviewing your brief and proposed time. We will email you when they respond.",
  },
  confirmed: {
    label: "Meeting confirmed",
    title: "Your consultation is confirmed",
    detail: "Your calendar invitation and meeting details are ready below.",
  },
  completed: {
    label: "Completed",
    title: "Your consultation was completed",
    detail: "The shared workspace remains available for files, messages and follow-up tasks.",
  },
  clarification_requested: {
    label: "Action needed",
    title: "The lawyer needs more information",
    detail: "Check your email for the lawyer’s question. Secure in-app replies are coming next.",
  },
  automatically_rematched: {
    label: "Finding another lawyer",
    title: "Meet is updating your match",
    detail: "Your original lawyer was unavailable, so we are routing the same brief to another suitable lawyer.",
  },
  declined: {
    label: "Lawyer unavailable",
    title: "This lawyer could not take the request",
    detail: "You can start a new match without rewriting your legal problem.",
  },
};

function money(amount?: number, currency = "EUR") {
  if (amount == null) return "No payment required";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

function caseStatus(item: ClientCase) {
  return statusCopy[item.status] || {
    label: item.status.replaceAll("_", " "),
    title: "Your request is being processed",
    detail: "You will see the next update here.",
  };
}

function caseStage(status: string) {
  if (status === "completed") return 4;
  if (status === "confirmed") return 3;
  if (status === "payment_pending") return 2;
  return 1;
}

export default function ClientAccount() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [cases, setCases] = useState<ClientCase[]>([]);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");

  async function load() {
    const response = await fetch("/api/client/account");
    if (response.ok) {
      const data = await response.json();
      setAccount(data.account);
      setCases(data.cases || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    const payment = new URLSearchParams(window.location.search).get("payment");
    const timer = window.setTimeout(() => {
      if (payment === "success")
        setPaymentNotice("Payment received. Your consultation is being confirmed.");
      if (payment === "cancelled")
        setPaymentNotice("Payment was cancelled. The lawyer’s approval remains valid in your workspace.");
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/client/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error || "Sign in failed.");
      return;
    }
    setLoading(true);
    await load();
  }

  async function logout() {
    await fetch("/api/client/logout", { method: "POST" });
    setAccount(null);
    setCases([]);
  }

  if (loading)
    return (
      <main className="client-account-shell">
        <p>Loading your requests…</p>
      </main>
    );

  if (!account)
    return (
      <main className="client-account-shell client-login-shell">
        <Link className="brand" href="/">
          <span className="brand-mark">M</span>
          <span>meet</span>
        </Link>
        <section className="client-login-card">
          <p className="section-kicker">Client account</p>
          <h1>Follow your legal requests.</h1>
          <p>Sign in with the account created when you contacted a lawyer.</p>
          <form onSubmit={login}>
            <label>
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="primary-button">
              Sign in <span>→</span>
            </button>
          </form>
          <Link href="/">Start a new request</Link>
        </section>
      </main>
    );

  return (
    <main className="client-account-shell">
      <header className="client-account-header">
        <Link className="brand" href="/">
          <span className="brand-mark">M</span>
          <span>meet</span>
        </Link>
        <div>
          <span>{account.name}</span>
          <button onClick={logout}>Sign out</button>
        </div>
      </header>
      <section className="client-dashboard-top">
        <div className="client-account-intro">
          <p className="section-kicker">Your private space</p>
          <h1>Hello, {account.name.split(" ")[0]}.</h1>
          <p>Everything concerning your legal requests, clearly organized.</p>
          <Link className="client-new-request" href="/">
            Start another request <span>→</span>
          </Link>
        </div>
        <aside className="client-account-summary">
          <div>
            <strong>{cases.length}</strong>
            <span>Total requests</span>
          </div>
          <div>
            <strong>
              {cases.filter((item) => item.status === "confirmed").length}
            </strong>
            <span>Confirmed meetings</span>
          </div>
          <div>
            <strong>
              {
                cases.filter((item) => item.status === "meeting_requested")
                  .length
              }
            </strong>
            <span>Awaiting review</span>
          </div>
        </aside>
      </section>
      {paymentNotice ? (
        <div className="booking-payment-notice" role="status">
          {paymentNotice}
        </div>
      ) : null}
      <div className="client-list-heading">
        <div>
          <p className="section-kicker">Requests</p>
          <h2>Your current matters</h2>
        </div>
        <span>{cases.length} total</span>
      </div>
      <section className="client-case-list">
        {cases.length ? (
          cases.map((item) => {
            const status = caseStatus(item);
            const stage = caseStage(item.status);
            return (
            <article className={`client-case-card ${item.status}`} key={item.id}>
              <div className="client-case-main">
                <span className={`client-case-status ${item.status}`}>
                  {status.label}
                </span>
                <h2>{item.brief.practice || "Legal request"}</h2>
                <p>{item.brief.summary}</p>
                <div className={`client-case-progress ${item.status}`}>
                  <span className="done">Request sent</span>
                  <i />
                  <span className={stage > 1 ? "done" : "current"}>Lawyer approval</span>
                  <i />
                  <span className={stage > 2 ? "done" : stage === 2 ? "current" : ""}>{item.payment_status === "not_required" ? "No payment" : "Payment"}</span>
                  <i />
                  <span className={stage > 3 ? "done" : stage === 3 ? "current" : ""}>Consultation</span>
                </div>
              </div>
              <aside className="client-case-next">
                <span>Next step</span>
                <strong>{status.title}</strong>
                <p>{status.detail}</p>
              </aside>
              <dl className="client-case-facts">
                <div>
                  <dt>Lawyer</dt>
                  <dd>{item.selected_lawyer_name || "Matching in progress"}</dd>
                </div>
                <div>
                  <dt>Proposed time</dt>
                  <dd>{item.meeting_time || "Not selected"}</dd>
                </div>
                <div>
                  <dt>Jurisdiction</dt>
                  <dd>{item.brief.jurisdiction || "To confirm"}</dd>
                </div>
                <div>
                  <dt>Payment</dt>
                  <dd>
                    {item.payment_status === "paid"
                      ? `${money(item.payment_amount_cents, item.payment_currency)} · Paid`
                      : item.payment_status === "unpaid"
                        ? `${money(item.payment_amount_cents, item.payment_currency)} · Pending`
                        : "Not required"}
                  </dd>
                </div>
              </dl>
              <div className="client-case-actions">
                {item.matter_id ? (
                  <Link className="primary-button compact" href={`/matters/${item.matter_id}`}>
                    Open request dashboard <span>→</span>
                  </Link>
                ) : null}
                {item.status === "payment_pending" && item.stripe_checkout_url ? (
                  <a className="primary-button compact" href={item.stripe_checkout_url}>
                    Complete payment <span>→</span>
                  </a>
                ) : null}
                {item.meeting_url ? (
                  <a className="primary-button compact" href={item.meeting_url} target="_blank" rel="noreferrer">
                    Join Google Meet <span>↗</span>
                  </a>
                ) : null}
                {item.selected_lawyer_slug ? (
                  <Link className="client-secondary-action" href={`/lawyers/${item.selected_lawyer_slug}`}>
                    View lawyer profile
                  </Link>
                ) : null}
                {item.payment_status === "paid" ? (
                  <a className="client-secondary-action" href={`/api/client/cases/${item.id}/receipt`} target="_blank" rel="noreferrer">
                    View Stripe receipt
                  </a>
                ) : null}
              </div>
              <details className="client-case-details">
                <summary>View the brief shared with the lawyer</summary>
                <div className="client-brief-grid">
                  <section>
                    <span>Situation</span>
                    <strong>{item.brief.dispute || item.brief.summary}</strong>
                  </section>
                  <section>
                    <span>Desired outcome</span>
                    <strong>{item.brief.desiredOutcome || "Discuss options and next steps"}</strong>
                  </section>
                  <section>
                    <span>Deadline</span>
                    <strong>{item.brief.deadline || "No deadline confirmed"}</strong>
                  </section>
                  <section>
                    <span>Urgency</span>
                    <strong>{item.brief.urgency || "Standard"}</strong>
                  </section>
                  <section>
                    <span>People or organisations</span>
                    <strong>{item.brief.parties || "Not provided"}</strong>
                  </section>
                  <section>
                    <span>Consultation</span>
                    <strong>{item.brief.language || "English"} · {item.brief.meetingFormat || "Video call"}</strong>
                  </section>
                </div>
                {item.brief.keyFacts?.length ? (
                  <div className="client-brief-list">
                    <span>Key facts</span>
                    <ul>{item.brief.keyFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
                  </div>
                ) : null}
                {item.brief.conversation?.length ? (
                  <details className="client-conversation-details">
                    <summary>Review your conversation with Meet</summary>
                    <div>
                      {item.brief.conversation.map((message, index) => (
                        <p className={message.role} key={`${message.role}-${index}`}>
                          <span>{message.role === "client" ? "You" : "Meet"}</span>
                          {message.content}
                        </p>
                      ))}
                    </div>
                  </details>
                ) : null}
              </details>
            </article>
          )})
        ) : (
          <div className="inquiry-empty">
            <h2>No requests yet.</h2>
            <p>Your requests will appear here after you contact a lawyer.</p>
          </div>
        )}
      </section>
    </main>
  );
}
