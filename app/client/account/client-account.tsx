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
    label: "Paiement requis",
    title: "Réglez pour confirmer le rendez-vous",
    detail: "L’avocat a accepté votre demande. Le paiement sécurisé est la dernière étape de confirmation.",
  },
  meeting_requested: {
    label: "En attente de l’avocat",
    title: "Votre demande est en cours d’étude",
    detail: "L’avocat examine votre synthèse et le créneau proposé. Vous serez averti de sa réponse.",
  },
  confirmed: {
    label: "Rendez-vous confirmé",
    title: "Votre consultation est confirmée",
    detail: "L’invitation calendrier et les informations du rendez-vous sont disponibles.",
  },
  completed: {
    label: "Terminée",
    title: "Votre consultation est terminée",
    detail: "Le dossier partagé reste disponible pour les documents, messages et prochaines actions.",
  },
  clarification_requested: {
    label: "Action requise",
    title: "L’avocat demande une précision",
    detail: "Répondez directement depuis la messagerie sécurisée de votre dossier.",
  },
  automatically_rematched: {
    label: "Nouvel avocat recherché",
    title: "Meet actualise votre mise en relation",
    detail: "Votre synthèse est conservée pendant la recherche d’un autre avocat adapté.",
  },
  declined: {
    label: "Demande refusée",
    title: "Cet avocat ne peut pas accepter la demande",
    detail: "Votre synthèse reste disponible pour contacter un autre avocat.",
  },
};

function money(amount?: number, currency = "EUR") {
  if (amount == null) return "Aucun paiement requis";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

function caseStatus(item: ClientCase) {
  return statusCopy[item.status] || {
    label: item.status.replaceAll("_", " "),
    title: "Votre demande est en cours",
    detail: "La prochaine étape apparaîtra ici.",
  };
}

function caseStage(status: string) {
  if (status === "completed") return 5;
  if (status === "confirmed") return 4;
  if (status === "payment_pending") return 3;
  return 2;
}

export default function ClientAccount({ googleEnabled = false }: { googleEnabled?: boolean }) {
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
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const timer = window.setTimeout(() => {
      if (payment === "success")
        setPaymentNotice("Paiement reçu. Votre consultation est en cours de confirmation.");
      if (payment === "cancelled")
        setPaymentNotice("Paiement annulé. La validation de l’avocat reste valable dans votre dossier.");
      if (params.get("oauth") === "failed")
        setError("La connexion Google a échoué. Vous pouvez réessayer ou utiliser votre mot de passe.");
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
      setError(data.error || "La connexion a échoué.");
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
        <p>Chargement de vos demandes…</p>
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
          <p className="section-kicker">Espace client</p>
          <h1>Suivez vos demandes juridiques.</h1>
          <p>Connectez-vous avec le compte créé lors de votre première demande.</p>
          {googleEnabled ? <><a className="google-auth-button" href="/api/oauth/google/start?role=client">
            <span>G</span> Continuer avec Google
          </a><div className="auth-separator"><span>ou</span></div></> : null}
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
              Mot de passe
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
              Se connecter <span>→</span>
            </button>
          </form>
          <Link href="/">Démarrer une nouvelle demande</Link>
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
          <button onClick={logout}>Se déconnecter</button>
        </div>
      </header>
      <section className="client-dashboard-top">
        <div className="client-account-intro">
          <p className="section-kicker">Votre espace privé</p>
          <h1>Bonjour, {account.name.split(" ")[0]}.</h1>
          <p>Toutes vos demandes juridiques, clairement organisées.</p>
          <Link className="client-new-request" href="/">
            Nouvelle demande <span>→</span>
          </Link>
        </div>
        <aside className="client-account-summary">
          <div>
            <strong>{cases.length}</strong>
            <span>Demandes</span>
          </div>
          <div>
            <strong>
              {cases.filter((item) => item.status === "confirmed").length}
            </strong>
            <span>Rendez-vous confirmés</span>
          </div>
          <div>
            <strong>
              {
                cases.filter((item) => item.status === "meeting_requested")
                  .length
              }
            </strong>
            <span>En attente</span>
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
          <p className="section-kicker">Demandes</p>
          <h2>Vos dossiers en cours</h2>
        </div>
        <span>{cases.length} au total</span>
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
                <h2>{item.brief.practice || "Demande juridique"}</h2>
                <p>{item.brief.summary}</p>
                <div className={`client-case-progress ${item.status}`}>
                  <span className="done">Demande envoyée</span>
                  <i />
                  <span className={stage > 2 ? "done" : "current"}>Validation avocat</span>
                  <i />
                  <span className={stage > 3 ? "done" : stage === 3 ? "current" : ""}>{item.payment_status === "not_required" ? "Sans paiement" : "Paiement"}</span>
                  <i />
                  <span className={stage > 4 ? "done" : stage === 4 ? "current" : ""}>Consultation</span>
                </div>
              </div>
              <aside className="client-case-next">
                <span>Prochaine étape</span>
                <strong>{status.title}</strong>
                <p>{status.detail}</p>
              </aside>
              <dl className="client-case-facts">
                <div>
                  <dt>Avocat</dt>
                  <dd>{item.selected_lawyer_name || "Recherche en cours"}</dd>
                </div>
                <div>
                  <dt>Créneau proposé</dt>
                  <dd>{item.meeting_time || "Non sélectionné"}</dd>
                </div>
                <div>
                  <dt>Juridiction</dt>
                  <dd>{item.brief.jurisdiction || "À confirmer"}</dd>
                </div>
                <div>
                  <dt>Paiement</dt>
                  <dd>
                    {item.payment_status === "paid"
                      ? `${money(item.payment_amount_cents, item.payment_currency)} · Payé`
                      : item.payment_status === "unpaid"
                        ? `${money(item.payment_amount_cents, item.payment_currency)} · En attente`
                        : "Non requis"}
                  </dd>
                </div>
              </dl>
              <div className="client-case-actions">
                {item.matter_id ? (
                  <Link className="primary-button compact" href={`/matters/${item.matter_id}`}>
                    Ouvrir le dossier <span>→</span>
                  </Link>
                ) : null}
                {item.status === "payment_pending" && item.stripe_checkout_url ? (
                  <a className="primary-button compact" href={item.stripe_checkout_url}>
                    Payer et confirmer <span>→</span>
                  </a>
                ) : null}
                {item.meeting_url ? (
                  <a className="primary-button compact" href={item.meeting_url} target="_blank" rel="noreferrer">
                    Rejoindre la visioconférence <span>↗</span>
                  </a>
                ) : null}
                {item.selected_lawyer_slug ? (
                  <Link className="client-secondary-action" href={`/lawyers/${item.selected_lawyer_slug}`}>
                    Voir le profil de l’avocat
                  </Link>
                ) : null}
                {item.payment_status === "paid" ? (
                  <a className="client-secondary-action" href={`/api/client/cases/${item.id}/receipt`} target="_blank" rel="noreferrer">
                    Voir le reçu Stripe
                  </a>
                ) : null}
              </div>
              <details className="client-case-details">
                <summary>Voir la synthèse transmise à l’avocat</summary>
                <div className="client-brief-grid">
                  <section>
                    <span>Situation</span>
                    <strong>{item.brief.dispute || item.brief.summary}</strong>
                  </section>
                  <section>
                    <span>Objectif</span>
                    <strong>{item.brief.desiredOutcome || "Clarifier les options et les prochaines étapes"}</strong>
                  </section>
                  <section>
                    <span>Échéance</span>
                    <strong>{item.brief.deadline || "Aucune échéance confirmée"}</strong>
                  </section>
                  <section>
                    <span>Urgence</span>
                    <strong>{item.brief.urgency || "Standard"}</strong>
                  </section>
                  <section>
                    <span>Personnes ou organisations</span>
                    <strong>{item.brief.parties || "Non renseigné"}</strong>
                  </section>
                  <section>
                    <span>Consultation</span>
                    <strong>{item.brief.language || "Français"} · {item.brief.meetingFormat || "Visioconférence"}</strong>
                  </section>
                </div>
                {item.brief.keyFacts?.length ? (
                  <div className="client-brief-list">
                    <span>Faits clés</span>
                    <ul>{item.brief.keyFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
                  </div>
                ) : null}
                {item.brief.conversation?.length ? (
                  <details className="client-conversation-details">
                    <summary>Relire votre conversation avec Meet</summary>
                    <div>
                      {item.brief.conversation.map((message, index) => (
                        <p className={message.role} key={`${message.role}-${index}`}>
                          <span>{message.role === "client" ? "Vous" : "Meet"}</span>
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
            <h2>Aucune demande pour le moment.</h2>
            <p>Vos demandes apparaîtront ici après avoir contacté un avocat.</p>
          </div>
        )}
      </section>
    </main>
  );
}
