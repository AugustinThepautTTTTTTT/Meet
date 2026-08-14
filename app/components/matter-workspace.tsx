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
    brief: {
      practice?: string;
      summary?: string;
      jurisdiction?: string;
      urgency?: string;
      deadline?: string;
      desiredOutcome?: string;
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

export default function MatterWorkspace({ matterId }: { matterId: string }) {
  const [data, setData] = useState<MatterData | null>(null);
  const [tab, setTab] = useState<"overview" | "messages" | "files" | "tasks">("overview");
  const [message, setMessage] = useState("");
  const [task, setTask] = useState({ title: "", assignedTo: "client", dueDate: "" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

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
  return (
    <main className="matter-shell">
      <header className="matter-topbar">
        <Link className="brand" href={data.actor.role === "lawyer" ? "/lawyer/dashboard" : "/client/account"}>
          <span className="brand-mark">M</span><span>meet</span>
        </Link>
        <div><span>Shared with {otherParty}</span><Link href={data.actor.role === "lawyer" ? "/lawyer/dashboard" : "/client/account"}>Back to dashboard</Link></div>
      </header>
      <section className="matter-hero">
        <div>
          <p className="section-kicker">Shared legal matter</p>
          <h1>{data.matter.brief.practice || "Legal matter"}</h1>
          <p>{data.matter.brief.summary}</p>
        </div>
        <aside>
          <span className={`client-case-status ${data.matter.status}`}>{data.matter.status.replaceAll("_", " ")}</span>
          <strong>{data.matter.meetingTime || "Meeting not scheduled"}</strong>
          <small>{data.matter.brief.jurisdiction || "Jurisdiction to confirm"}</small>
        </aside>
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
