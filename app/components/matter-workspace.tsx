"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import LoadingScreen from "@/app/components/loading-screen";

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
  if (!value) return "Aucune date définie";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: value.includes("T") ? "short" : undefined }).format(new Date(value));
}

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const workflowSteps = ["Demande", "Validation avocat", "Paiement", "Consultation"];

function workflowPosition(status: string) {
  if (status === "completed") return 5;
  if (status === "confirmed") return 4;
  if (status === "payment_pending") return 3;
  if (status === "declined") return 0;
  return 2;
}

function statusLabel(status: string) {
  return ({
    pending: "En attente de l’avocat",
    clarification_requested: "Précision demandée",
    payment_pending: "Demande acceptée · paiement requis",
    confirmed: "Consultation confirmée",
    completed: "Consultation terminée",
    declined: "Demande refusée",
  } as Record<string, string>)[status] || status.replaceAll("_", " ");
}

function money(amount?: number, currency = "EUR") {
  if (!amount) return "Aucun paiement requis";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount / 100);
}

function eventCopy(type: string, description: string) {
  const copy: Record<string, [string, string]> = {
    request: ["Demande", "Demande envoyée à l’avocat pour étude"],
    approval: ["Validation", "Demande validée par l’avocat, en attente du paiement"],
    payment: ["Paiement", "Paiement confirmé et consultation réservée"],
    confirmation: ["Confirmation", "Consultation validée et confirmée"],
    question: ["Précision", "L’avocat a demandé une information complémentaire"],
    declined: ["Décision", "Demande refusée par l’avocat"],
    completed: ["Consultation", "Consultation marquée comme terminée"],
    message: ["Message", "Nouveau message dans le dossier"],
    file: ["Document", "Nouveau document partagé"],
    task: ["Tâche", "Nouvelle action ajoutée au dossier"],
  };
  return copy[type] || [type, description];
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
      setError("Ce dossier est indisponible ou vous n’y avez pas accès.");
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
      setPaymentNotice(payment === "success" ? "Paiement reçu. Nous confirmons votre consultation." : "Paiement annulé. La validation de l’avocat reste valable.");
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
    if (!response.ok) setError(result.error || "La demande n’a pas pu être mise à jour.");
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
    if (!response.ok) setError(result.error || "Le message n’a pas pu être envoyé.");
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
    if (!response.ok) setError(result.error || "Le document n’a pas pu être partagé.");
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
    if (!response.ok) setError(result.error || "La tâche n’a pas pu être créée.");
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
      setError(result.error || "La tâche n’a pas pu être mise à jour.");
    } else await load();
    setBusy("");
  }

  if (error && !data)
    return <main className="matter-shell"><div className="matter-error"><h1>Dossier indisponible</h1><p>{error}</p><Link href="/">Retour à Repere</Link></div></main>;
  if (!data) return <LoadingScreen />;

  const otherParty = data.actor.role === "client" ? data.matter.lawyerName : data.matter.clientName;
  const openTasks = data.tasks.filter((item) => item.status === "open").length;
  const position = workflowPosition(data.matter.status);
  const paymentRequired = data.matter.paymentStatus === "unpaid" || data.matter.paymentStatus === "paid";
  return (
    <main className="matter-shell">
      <header className="matter-topbar">
        <Link className="brand" href={data.actor.role === "lawyer" ? "/lawyer/dashboard" : "/client/account"}>
          <span className="brand-mark" aria-hidden="true" /><span>repere</span>
        </Link>
        <div><span>Partagé avec {otherParty}</span><Link href={data.actor.role === "lawyer" ? "/lawyer/dashboard" : "/client/account"}>Retour au tableau de bord</Link></div>
      </header>
      {paymentNotice ? <div className="matter-payment-notice" role="status">{paymentNotice}</div> : null}
      <section className="matter-hero matter-hero-compact">
        <div>
          <p className="section-kicker">Votre dossier partagé</p>
          <h1>{data.matter.brief.practice || "Dossier juridique"}</h1>
          <p>{data.matter.brief.summary}</p>
        </div>
        <aside>
          <span className={`client-case-status ${data.matter.status}`}>{statusLabel(data.matter.status)}</span>
          <strong>{data.matter.meetingTime || "Créneau non défini"}</strong>
          <small>{data.matter.brief.jurisdiction || "Juridiction à confirmer"}</small>
        </aside>
      </section>
      <section className="matter-workflow" aria-label="Progression de la demande">
        {workflowSteps.map((step, index) => {
          const stepNumber = index + 1;
          const paymentSkipped = step === "Paiement" && !paymentRequired;
          return <div className={stepNumber < position || data.matter.status === "completed" || paymentSkipped && position >= 3 ? "done" : stepNumber === position ? "current" : ""} key={step}>
            <span>{stepNumber < position || data.matter.status === "completed" || paymentSkipped && position >= 3 ? "✓" : stepNumber}</span>
            <strong>{paymentSkipped ? "Aucun paiement requis" : step}</strong>
          </div>;
        })}
      </section>
      <section className="matter-focus-grid">
        <article className="matter-next-action">
          <p className="section-kicker">Prochaine étape</p>
          {data.matter.status === "pending" ? <>
            <h2>{data.actor.role === "lawyer" ? "Étudiez puis validez cette demande" : "L’avocat étudie votre demande"}</h2>
            <p>{data.actor.role === "lawyer" ? "Le créneau proposé reste réservé jusqu’à votre décision." : `${data.matter.lawyerName} a reçu votre synthèse, vos documents et le créneau proposé.`}</p>
            {data.actor.role === "lawyer" ? <div className="matter-lawyer-decision"><textarea value={statusNote} onChange={(event) => setStatusNote(event.target.value)} placeholder="Note facultative ou question précise pour le client" rows={3} /><div><button className="decline-button" disabled={busy === "status"} onClick={() => void updateStatus("declined")}>Refuser</button><button className="card-button" disabled={busy === "status" || !statusNote.trim()} onClick={() => void updateStatus("clarification_requested")}>Demander une précision</button><button className="primary-button compact" disabled={busy === "status"} onClick={() => void updateStatus("accepted")}>Valider la demande <span>→</span></button></div></div> : null}
          </> : null}
          {data.matter.status === "clarification_requested" ? <>
            <h2>{data.actor.role === "client" ? "L’avocat a besoin d’une précision" : "En attente de la réponse du client"}</h2>
            <p>{data.matter.lawyerNote || "Poursuivez l’échange dans la messagerie du dossier."}</p>
            <button className="card-button" onClick={() => setTab("messages")}>Ouvrir la messagerie</button>
            {data.actor.role === "lawyer" ? <button className="primary-button compact" disabled={busy === "status"} onClick={() => void updateStatus("accepted")}>Valider maintenant <span>→</span></button> : null}
          </> : null}
          {data.matter.status === "payment_pending" ? <>
            <h2>{data.actor.role === "client" ? "Réglez pour confirmer la consultation" : "En attente du paiement du client"}</h2>
            <p>L’avocat a validé la demande. Le rendez-vous sera définitivement confirmé après le paiement sécurisé.</p>
            <strong className="matter-payment-amount">{money(data.matter.paymentAmountCents, data.matter.paymentCurrency)}</strong>
            {data.actor.role === "client" && data.matter.checkoutUrl ? <a className="primary-button compact" href={data.matter.checkoutUrl}>Payer et confirmer <span>→</span></a> : null}
          </> : null}
          {data.matter.status === "confirmed" ? <>
            <h2>Votre consultation est confirmée</h2>
            <p>La synthèse, les documents et les tâches de préparation restent réunis ici.</p>
            {data.matter.meetingUrl ? <a className="primary-button compact" href={data.matter.meetingUrl} target="_blank" rel="noreferrer">Rejoindre la visioconférence <span>↗</span></a> : null}
            {data.actor.role === "lawyer" ? <button className="card-button" disabled={busy === "status"} onClick={() => void updateStatus("completed")}>Marquer la consultation comme terminée</button> : null}
          </> : null}
          {data.matter.status === "completed" ? <><h2>Consultation terminée</h2><p>Le dossier reste accessible pour les documents, décisions et prochaines étapes.</p></> : null}
          {data.matter.status === "declined" ? <><h2>Cette demande a été refusée</h2><p>La synthèse et les documents restent accessibles afin de contacter un autre avocat.</p></> : null}
        </article>
        <article className="matter-intelligence">
          <div><p className="section-kicker">Synthèse du dossier</p><span>À jour</span></div>
          <h2>{data.matter.brief.desiredOutcome || "Préparer une première consultation utile"}</h2>
          <p>{data.matter.brief.summary}</p>
          {data.matter.brief.keyFacts?.length ? <ul>{data.matter.brief.keyFacts.slice(0, 3).map((fact) => <li key={fact}>{fact}</li>)}</ul> : null}
          <small>Repere rassemble la synthèse, les documents, les messages et les actions de ce dossier.</small>
        </article>
      </section>
      <nav className="matter-tabs" aria-label="Contenu du dossier">
        {(["overview", "messages", "files", "tasks"] as const).map((item) => (
          <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>
            {({ overview: "Vue d’ensemble", messages: "Messages", files: "Documents", tasks: "Tâches" } as const)[item]}<span>{item === "messages" ? data.messages.length : item === "files" ? data.files.length : item === "tasks" ? openTasks : ""}</span>
          </button>
        ))}
      </nav>
      {error ? <div className="matter-inline-error" role="alert">{error}</div> : null}
      {tab === "overview" ? (
        <section className="matter-overview">
          <div className="matter-overview-grid">
            <article><span>Intervenants</span><strong>{data.matter.clientName}</strong><p>Client</p><strong>{data.matter.lawyerName}</strong><p>Avocat</p></article>
            <article><span>Avancement</span><strong>{openTasks} tâche{openTasks === 1 ? "" : "s"} ouverte{openTasks === 1 ? "" : "s"}</strong><p>{data.files.length} document{data.files.length === 1 ? "" : "s"} · {data.messages.length} message{data.messages.length === 1 ? "" : "s"}</p></article>
            <article><span>Objectif</span><strong>{data.matter.brief.desiredOutcome || "Clarifier les options juridiques et les prochaines étapes"}</strong><p>{data.matter.brief.deadline || "Aucune échéance confirmée"}</p></article>
          </div>
          <div className="matter-activity">
            <div><p className="section-kicker">Historique</p><h2>Toute l’activité du dossier</h2></div>
            {data.events.length ? data.events.map((event) => {
              const [label, description] = eventCopy(event.event_type, event.description);
              return <div className="matter-event" key={event.id}><span>{label}</span><strong>{description}</strong><small>{event.actor_name} · {readableDate(event.created_at)}</small></div>;
            }) : <p className="matter-empty">Les messages, documents et tâches apparaîtront ici au fil du dossier.</p>}
          </div>
        </section>
      ) : null}
      {tab === "messages" ? (
        <section className="matter-panel matter-messages">
          <header><div><p className="section-kicker">Messagerie sécurisée</p><h2>Échangez dans le contexte du dossier</h2></div><small>Visible uniquement par le client et l’avocat</small></header>
          <div className="matter-message-list">
            {data.messages.length ? data.messages.map((item) => (
              <article className={item.author_role === data.actor.role ? "mine" : ""} key={item.id}><span>{item.author_name} · {readableDate(item.created_at)}</span><p>{item.body}</p></article>
            )) : <p className="matter-empty">Aucun message pour le moment.</p>}
          </div>
          <form className="matter-message-form" onSubmit={sendMessage}><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} rows={4} placeholder={`Écrire à ${otherParty}…`} /><button className="primary-button compact" disabled={busy === "message"}>{busy === "message" ? "Envoi…" : "Envoyer"}<span>→</span></button></form>
        </section>
      ) : null}
      {tab === "files" ? (
        <section className="matter-panel">
          <header><div><p className="section-kicker">Documents privés</p><h2>Pièces partagées dans ce dossier</h2></div><small>Stockage privé · téléchargement authentifié</small></header>
          <form className="matter-upload" onSubmit={uploadFile}><input name="file" type="file" accept=".pdf,.docx,.jpg,.jpeg,.png,.txt" required /><div><strong>PDF, DOCX, JPG, PNG ou TXT</strong><span>10 Mo maximum par fichier.</span></div><button className="primary-button compact" disabled={busy === "file"}>{busy === "file" ? "Ajout…" : "Partager"}</button></form>
          <div className="matter-file-list">{data.files.length ? data.files.map((file) => (
            <a href={`/api/matters/${matterId}/files/${file.id}`} key={file.id}><span>{file.filename.split(".").pop()?.toUpperCase()}</span><div><strong>{file.filename}</strong><small>{file.uploader_name} · {fileSize(file.size_bytes)} · {readableDate(file.created_at)}</small></div><b>Télécharger ↓</b></a>
          )) : <p className="matter-empty">Aucun document partagé pour le moment.</p>}</div>
          <p className="matter-security-note">Les documents sont privés et leur accès est contrôlé.</p>
        </section>
      ) : null}
      {tab === "tasks" ? (
        <section className="matter-panel">
          <header><div><p className="section-kicker">Liste partagée</p><h2>Prochaines actions</h2></div><small>{openTasks} ouverte{openTasks === 1 ? "" : "s"}</small></header>
          {data.actor.role === "lawyer" ? <form className="matter-task-form" onSubmit={createTask}><input value={task.title} onChange={(event) => setTask({ ...task, title: event.target.value })} placeholder="Ex. : transmettre le contrat signé" required /><select value={task.assignedTo} onChange={(event) => setTask({ ...task, assignedTo: event.target.value })}><option value="client">Attribuer au client</option><option value="lawyer">Me l’attribuer</option></select><input type="date" value={task.dueDate} onChange={(event) => setTask({ ...task, dueDate: event.target.value })} /><button className="primary-button compact" disabled={busy === "task"}>Ajouter</button></form> : null}
          <div className="matter-task-list">{data.tasks.length ? data.tasks.map((item) => {
            const canToggle = data.actor.role === "lawyer" || item.assigned_to === data.actor.role;
            const assignee = item.assigned_to === "client" ? "client" : "avocat";
            return <label className={item.status === "done" ? "done" : ""} key={item.id}><input type="checkbox" checked={item.status === "done"} disabled={!canToggle || busy === item.id} onChange={() => void toggleTask(item.id, item.status === "done" ? "open" : "done")} /><div><strong>{item.title}</strong><span>Pour le {assignee} · {item.due_date ? `Échéance : ${readableDate(item.due_date)}` : "Sans échéance"}</span></div>{!canToggle ? <small>Attribuée au {assignee}</small> : null}</label>;
          }) : <p className="matter-empty">Aucune tâche. L’avocat peut préparer une liste d’actions pour le dossier.</p>}</div>
        </section>
      ) : null}
    </main>
  );
}
