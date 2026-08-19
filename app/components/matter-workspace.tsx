"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type MatterData = {
  actor: { role: "client" | "lawyer"; name: string };
  matter: {
    id: string;
    status: string;
    lawyerName: string;
    lawyerSlug: string;
    clientName: string;
    meetingTime: string;
    meetingStart?: string;
    meetingUrl?: string;
    paymentStatus?: string;
    paymentAmountCents?: number;
    paymentCurrency?: string;
    checkoutUrl?: string;
    lawyerNote?: string;
    brief: {
      practice?: string;
      summary?: string;
      jurisdiction?: string;
      urgency?: string;
      deadline?: string;
      desiredOutcome?: string;
      keyFacts?: string[];
      missingInformation?: string[];
    };
  };
  messages: Array<{ id: string; author_role: string; author_name: string; body: string; created_at: string }>;
  files: Array<{ id: string; uploader_role: string; uploader_name: string; filename: string; mime_type: string; size_bytes: number; created_at: string }>;
  tasks: Array<{ id: string; title: string; assigned_to: "client" | "lawyer"; status: "open" | "done"; due_date?: string; created_at: string }>;
  events: Array<{ id: string; actor_name: string; event_type: string; description: string; created_at: string }>;
};

function readableDate(value?: string) {
  if (!value) return "No date set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: value.includes("T") ? "short" : undefined }).format(new Date(value));
}

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const workflowSteps = ["Request", "Approval", "Payment", "Consultation"];

function workflowPosition(status: string) {
  if (status === "completed") return 4;
  if (status === "confirmed") return 3;
  if (status === "payment_pending") return 2;
  if (status === "declined") return 0;
  return 1;
}

function statusLabel(status: string) {
  return ({
    pending: "Awaiting lawyer review",
    clarification_requested: "Information requested",
    payment_pending: "Approved · payment required",
    confirmed: "Consultation confirmed",
    completed: "Consultation completed",
    declined: "Request declined",
  } as Record<string, string>)[status] || status.replaceAll("_", " ");
}

function money(amount?: number, currency = "EUR") {
  if (!amount) return "No payment required";
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount / 100);
}

export default function MatterWorkspace({ matterId }: { matterId: string }) {
  const [data, setData] = useState<MatterData | null>(null);
  const [tab, setTab] = useState<"overview" | "messages" | "files" | "tasks">("overview");
  const [message, setMessage] = useState("");
  const [task, setTask] = useState({ title: "", assignedTo: "client", dueDate: "" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/matters/${matterId}`);
    if (!response.ok) {
      setError("This shared matter is unavailable or you do not have access.");
      return;
    }
    setData(await response.json());
  }, [matterId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const payment = new URLSearchParams(window.location.search).get("payment");
    if (!payment) return;
    const noticeTimer = window.setTimeout(() => {
      setPaymentNotice(payment === "success" ? "Payment received. We are confirming the consultation." : "Payment was cancelled. Your approved request is still here.");
    }, 0);
    if (payment === "success") {
      const first = window.setTimeout(() => void load(), 1800);
      const second = window.setTimeout(() => void load(), 4500);
      return () => { window.clearTimeout(noticeTimer); window.clearTimeout(first); window.clearTimeout(second); };
    }
    return () => window.clearTimeout(noticeTimer);
  }, [load]);

  async function updateStatus(status: "accepted" | "declined" | "clarification_requested" | "completed") {
    setBusy("status");
    setError("");
    const response = await fetch(`/api/account/inquiries/${matterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note: statusNote }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error || "The request could not be updated.");
    else {
      setStatusNote("");
      await load();
    }
    setBusy("");
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setBusy("message");
    setError("");
    const response = await fetch(`/api/matters/${matterId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: message }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error || "Message could not be sent.");
    else {
      setMessage("");
      await load();
    }
    setBusy("");
  }

  async function uploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    if (!input.files?.[0]) return;
    setBusy("file");
    setError("");
    const payload = new FormData();
    payload.set("file", input.files[0]);
    const response = await fetch(`/api/matters/${matterId}/files`, { method: "POST", body: payload });
    const result = await response.json();
    if (!response.ok) setError(result.error || "File could not be shared.");
    else {
      form.reset();
      await load();
    }
    setBusy("");
  }

  async function createTask(event: FormEvent) {
    event.preventDefault();
    setBusy("task");
    setError("");
    const response = await fetch(`/api/matters/${matterId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error || "Task could not be created.");
    else {
      setTask({ title: "", assignedTo: "client", dueDate: "" });
      await load();
    }
    setBusy("");
  }

  async function toggleTask(taskId: string, status: "open" | "done") {
    setBusy(taskId);
    const response = await fetch(`/api/matters/${matterId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const result = await response.json();
      setError(result.error || "Task could not be updated.");
    } else await load();
    setBusy("");
  }

  if (error && !data)
    return <main className="matter-shell"><div className="matter-error"><h1>Workspace unavailable</h1><p>{error}</p><Link href="/">Return to Meet</Link></div></main>;
  if (!data) return <main className="matter-shell"><p>Opening your secure workspace…</p></main>;

  const otherParty = data.actor.role === "client" ? data.matter.lawyerName : data.matter.clientName;
  const openTasks = data.tasks.filter((item) => item.status === "open").length;
  const position = workflowPosition(data.matter.status);
  const paymentRequired = data.matter.paymentStatus === "unpaid" || data.matter.paymentStatus === "paid";
  return (
    <main className="matter-shell">
      <header className="matter-topbar">
        <Link className="brand" href={data.actor.role === "lawyer" ? "/lawyer/dashboard" : "/client/account"}>
          <span className="brand-mark">M</span><span>meet</span>
        </Link>
        <div><span>Shared with {otherParty}</span><Link href={data.actor.role === "lawyer" ? "/lawyer/dashboard" : "/client/account"}>Back to dashboard</Link></div>
      </header>
      {paymentNotice ? <div className="matter-payment-notice" role="status">{paymentNotice}</div> : null}
      <section className="matter-hero matter-hero-compact">
        <div>
          <p className="section-kicker">One shared request</p>
          <h1>{data.matter.brief.practice || "Legal matter"}</h1>
          <p>{data.matter.brief.summary}</p>
        </div>
        <aside>
          <span className={`client-case-status ${data.matter.status}`}>{statusLabel(data.matter.status)}</span>
          <strong>{data.matter.meetingTime || "Meeting not scheduled"}</strong>
          <small>{data.matter.brief.jurisdiction || "Jurisdiction to confirm"}</small>
        </aside>
      </section>
      <section className="matter-workflow" aria-label="Request progress">
        {workflowSteps.map((step, index) => {
          const stepNumber = index + 1;
          const paymentSkipped = step === "Payment" && !paymentRequired;
          return <div className={stepNumber < position || data.matter.status === "completed" || paymentSkipped && position >= 3 ? "done" : stepNumber === position ? "current" : ""} key={step}>
            <span>{stepNumber < position || data.matter.status === "completed" || paymentSkipped && position >= 3 ? "✓" : stepNumber}</span>
            <strong>{paymentSkipped ? "Payment not required" : step}</strong>
          </div>;
        })}
      </section>
      <section className="matter-focus-grid">
        <article className="matter-next-action">
          <p className="section-kicker">Next step</p>
          {data.matter.status === "pending" ? <>
            <h2>{data.actor.role === "lawyer" ? "Review and respond to this request" : "Waiting for the lawyer’s decision"}</h2>
            <p>{data.actor.role === "lawyer" ? "The proposed time is held until you approve or decline it." : `${data.matter.lawyerName} has received the complete brief and proposed time.`}</p>
            {data.actor.role === "lawyer" ? <div className="matter-lawyer-decision"><textarea value={statusNote} onChange={(event) => setStatusNote(event.target.value)} placeholder="Optional note, or write a focused clarification question" rows={3} /><div><button className="decline-button" disabled={busy === "status"} onClick={() => void updateStatus("declined")}>Decline</button><button className="card-button" disabled={busy === "status" || !statusNote.trim()} onClick={() => void updateStatus("clarification_requested")}>Ask a question</button><button className="primary-button compact" disabled={busy === "status"} onClick={() => void updateStatus("accepted")}>Approve request <span>→</span></button></div></div> : null}
          </> : null}
          {data.matter.status === "clarification_requested" ? <>
            <h2>{data.actor.role === "client" ? "The lawyer needs one clarification" : "Waiting for the client’s reply"}</h2>
            <p>{data.matter.lawyerNote || "Open messages to continue the discussion without losing the case context."}</p>
            <button className="card-button" onClick={() => setTab("messages")}>Open messages</button>
            {data.actor.role === "lawyer" ? <button className="primary-button compact" disabled={busy === "status"} onClick={() => void updateStatus("accepted")}>Approve now <span>→</span></button> : null}
          </> : null}
          {data.matter.status === "payment_pending" ? <>
            <h2>{data.actor.role === "client" ? "Pay to confirm the consultation" : "Waiting for client payment"}</h2>
            <p>The lawyer approved the request. The meeting becomes final only after the secure payment is confirmed.</p>
            <strong className="matter-payment-amount">{money(data.matter.paymentAmountCents, data.matter.paymentCurrency)}</strong>
            {data.actor.role === "client" && data.matter.checkoutUrl ? <a className="primary-button compact" href={data.matter.checkoutUrl}>Pay securely with Stripe <span>→</span></a> : null}
          </> : null}
          {data.matter.status === "confirmed" ? <>
            <h2>Your consultation is confirmed</h2>
            <p>The brief, documents and preparation tasks remain attached to this workspace.</p>
            {data.matter.meetingUrl ? <a className="primary-button compact" href={data.matter.meetingUrl} target="_blank" rel="noreferrer">Join meeting <span>↗</span></a> : null}
            {data.actor.role === "lawyer" ? <button className="card-button" disabled={busy === "status"} onClick={() => void updateStatus("completed")}>Mark consultation completed</button> : null}
          </> : null}
          {data.matter.status === "completed" ? <><h2>Consultation completed</h2><p>This workspace remains available for the shared files, decisions and next steps.</p></> : null}
          {data.matter.status === "declined" ? <><h2>This request was declined</h2><p>The brief and files remain available while the client chooses another lawyer.</p></> : null}
        </article>
        <article className="matter-intelligence">
          <div><p className="section-kicker">Case intelligence</p><span>Live</span></div>
          <h2>{data.matter.brief.desiredOutcome || "A clear first consultation"}</h2>
          <p>{data.matter.brief.summary}</p>
          {data.matter.brief.keyFacts?.length ? <ul>{data.matter.brief.keyFacts.slice(0, 3).map((fact) => <li key={fact}>{fact}</li>)}</ul> : null}
          <small>Meet keeps the brief, documents, messages and actions aligned in this request.</small>
        </article>
      </section>
      <nav className="matter-tabs" aria-label="Matter workspace">
        {(["overview", "messages", "files", "tasks"] as const).map((item) => (
          <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>
            {item}<span>{item === "messages" ? data.messages.length : item === "files" ? data.files.length : item === "tasks" ? openTasks : ""}</span>
          </button>
        ))}
      </nav>
      {error ? <div className="matter-inline-error" role="alert">{error}</div> : null}
      {tab === "overview" ? (
        <section className="matter-overview">
          <div className="matter-overview-grid">
            <article><span>People</span><strong>{data.matter.clientName}</strong><p>Client</p><strong>{data.matter.lawyerName}</strong><p>Lawyer</p></article>
            <article><span>Progress</span><strong>{openTasks} open tasks</strong><p>{data.files.length} shared files · {data.messages.length} messages</p></article>
            <article><span>Objective</span><strong>{data.matter.brief.desiredOutcome || "Agree on legal options and next steps"}</strong><p>{data.matter.brief.deadline || "No deadline confirmed"}</p></article>
          </div>
          <div className="matter-activity">
            <div><p className="section-kicker">Activity</p><h2>Everything in one timeline</h2></div>
            {data.events.length ? data.events.map((event) => (
              <div className="matter-event" key={event.id}><span>{event.event_type}</span><strong>{event.description}</strong><small>{event.actor_name} · {readableDate(event.created_at)}</small></div>
            )) : <p className="matter-empty">Messages, files and tasks will appear here as the matter progresses.</p>}
          </div>
        </section>
      ) : null}
      {tab === "messages" ? (
        <section className="matter-panel matter-messages">
          <header><div><p className="section-kicker">Secure messages</p><h2>Keep decisions attached to the matter</h2></div><small>Visible only to the client and lawyer</small></header>
          <div className="matter-message-list">
            {data.messages.length ? data.messages.map((item) => (
              <article className={item.author_role === data.actor.role ? "mine" : ""} key={item.id}><span>{item.author_name} · {readableDate(item.created_at)}</span><p>{item.body}</p></article>
            )) : <p className="matter-empty">No messages yet. Start with a focused question or update.</p>}
          </div>
          <form className="matter-message-form" onSubmit={sendMessage}><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} rows={4} placeholder={`Write to ${otherParty}…`} /><button className="primary-button compact" disabled={busy === "message"}>{busy === "message" ? "Sending…" : "Send message"}<span>→</span></button></form>
        </section>
      ) : null}
      {tab === "files" ? (
        <section className="matter-panel">
          <header><div><p className="section-kicker">Private documents</p><h2>Files shared for this matter</h2></div><small>Private storage · authenticated downloads</small></header>
          <form className="matter-upload" onSubmit={uploadFile}><input name="file" type="file" accept=".pdf,.docx,.jpg,.jpeg,.png,.txt" required /><div><strong>PDF, DOCX, JPG, PNG or TXT</strong><span>10 MB maximum. Avoid uploading originals you still need.</span></div><button className="primary-button compact" disabled={busy === "file"}>{busy === "file" ? "Uploading…" : "Share file"}</button></form>
          <div className="matter-file-list">{data.files.length ? data.files.map((file) => (
            <a href={`/api/matters/${matterId}/files/${file.id}`} key={file.id}><span>{file.filename.split(".").pop()?.toUpperCase()}</span><div><strong>{file.filename}</strong><small>{file.uploader_name} · {fileSize(file.size_bytes)} · {readableDate(file.created_at)}</small></div><b>Download ↓</b></a>
          )) : <p className="matter-empty">No documents have been shared yet.</p>}</div>
          <p className="matter-security-note">Files are private and access-controlled. This proof of concept restricts file types but does not yet include malware scanning or document redaction.</p>
        </section>
      ) : null}
      {tab === "tasks" ? (
        <section className="matter-panel">
          <header><div><p className="section-kicker">Shared checklist</p><h2>What needs to happen next</h2></div><small>{openTasks} open</small></header>
          {data.actor.role === "lawyer" ? <form className="matter-task-form" onSubmit={createTask}><input value={task.title} onChange={(event) => setTask({ ...task, title: event.target.value })} placeholder="e.g. Upload signed employment contract" required /><select value={task.assignedTo} onChange={(event) => setTask({ ...task, assignedTo: event.target.value })}><option value="client">Assign to client</option><option value="lawyer">Assign to me</option></select><input type="date" value={task.dueDate} onChange={(event) => setTask({ ...task, dueDate: event.target.value })} /><button className="primary-button compact" disabled={busy === "task"}>Add task</button></form> : null}
          <div className="matter-task-list">{data.tasks.length ? data.tasks.map((item) => {
            const canToggle = data.actor.role === "lawyer" || item.assigned_to === data.actor.role;
            return <label className={item.status === "done" ? "done" : ""} key={item.id}><input type="checkbox" checked={item.status === "done"} disabled={!canToggle || busy === item.id} onChange={() => void toggleTask(item.id, item.status === "done" ? "open" : "done")} /><div><strong>{item.title}</strong><span>For {item.assigned_to} · {item.due_date ? `Due ${readableDate(item.due_date)}` : "No due date"}</span></div>{!canToggle ? <small>Assigned to {item.assigned_to}</small> : null}</label>;
          }) : <p className="matter-empty">No tasks yet. The lawyer can create a focused checklist for the matter.</p>}</div>
        </section>
      ) : null}
    </main>
  );
}
