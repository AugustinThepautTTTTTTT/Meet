"use client";

import Link from "next/link";
import LoadingScreen from "@/app/components/loading-screen";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ArticleStudio, {
  blankArticle,
  type ArticleDraft,
} from "./article-studio";
import MediaUpload from "./media-upload";

type Profile = {
  slug?: string;
  name: string;
  specialty: string;
  practice: string;
  location: string;
  languages: string;
  price: string;
  first_consultation_price_cents: number | null;
  consultation_currency: string;
  first_consultation_free: boolean;
  availability: string;
  accent: string;
  reasons: string[];
  bio: string;
  experience: string;
  credentials: string;
  tags: string[];
  profile_photo_url: string;
  cover_photo_url: string;
  photo_settings: { x?: number; y?: number; position?: number; zoom: number };
  cover_settings: { x?: number; y?: number; position?: number; zoom: number };
  tagline: string;
  firm_name: string;
  website: string;
  linkedin: string;
  education: string;
  awards: string[];
  services: string[];
  consultation_format: string;
  published: boolean;
};
type Inquiry = {
  id: string;
  client_name: string;
  client_email: string;
  meeting_time: string;
  meeting_start?: string;
  meeting_uid?: string;
  invite_sent_at?: string;
  status: "pending" | "accepted" | "declined" | "clarification_requested" | "payment_pending" | "confirmed" | "completed";
  payment_status?: "unpaid" | "paid" | "not_required";
  payment_amount_cents?: number;
  payment_currency?: string;
  lawyer_note: string;
  created_at: string;
  brief: {
    summary: string;
    dispute?: string;
    keyFacts?: string[];
    conversation?: Array<{
      role: "client" | "assistant";
      content: string;
    }>;
    practice: string;
    jurisdiction: string;
    urgency: string;
    deadline: string;
    desiredOutcome: string;
    language: string;
    meetingFormat: string;
    parties: string;
    timeline?: string[];
    missingInformation?: string[];
  };
};
type CalendarSettings = {
  provider: string;
  ical_url: string;
  timezone: string;
  duration_minutes: number;
  buffer_minutes: number;
  booking_days_ahead: number;
  weekly_hours: Record<string, [string, string]>;
  enabled: boolean;
};

function inquiryStatusLabel(status: Inquiry["status"]) {
  return ({
    pending: "À étudier",
    clarification_requested: "Précision demandée",
    payment_pending: "Validée · paiement en attente",
    confirmed: "Consultation confirmée",
    completed: "Consultation terminée",
    accepted: "Acceptée",
    declined: "Refusée",
  } as Record<Inquiry["status"], string>)[status];
}
const defaultCalendar: CalendarSettings = {
  provider: "google",
  ical_url: "",
  timezone: "Europe/Paris",
  duration_minutes: 30,
  buffer_minutes: 15,
  booking_days_ahead: 21,
  weekly_hours: {
    monday: ["09:00", "17:00"],
    tuesday: ["09:00", "17:00"],
    wednesday: ["09:00", "17:00"],
    thursday: ["09:00", "17:00"],
    friday: ["09:00", "17:00"],
  },
  enabled: false,
};
const blankProfile: Profile = {
  name: "",
  specialty: "",
  practice: "Business",
  location: "Remote",
  languages: "English",
  price: "Contact for pricing",
  first_consultation_price_cents: null,
  consultation_currency: "EUR",
  first_consultation_free: false,
  availability: "Within one business day",
  accent: "blue",
  reasons: [],
  bio: "",
  experience: "",
  credentials: "Credentials pending verification",
  tags: [],
  profile_photo_url: "",
  cover_photo_url: "",
  photo_settings: { x: 50, y: 50, zoom: 100 },
  cover_settings: { x: 50, y: 50, zoom: 100 },
  tagline: "",
  firm_name: "",
  website: "",
  linkedin: "",
  education: "",
  awards: [],
  services: [],
  consultation_format: "Video or in person",
  published: false,
};

function formatConsultationPrice(profile: Profile) {
  if (profile.first_consultation_free) return "First consultation free";
  if (profile.first_consultation_price_cents != null) {
    return `${new Intl.NumberFormat("en", {
      style: "currency",
      currency: profile.consultation_currency || "EUR",
      maximumFractionDigits:
        profile.first_consultation_price_cents % 100 ? 2 : 0,
    }).format(
      profile.first_consultation_price_cents / 100,
    )} · first consultation`;
  }
  return profile.price || "Contact for pricing";
}

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<
    "overview" | "inquiries" | "profile" | "calendar" | "settings" | "articles"
  >("overview");
  const [account, setAccount] = useState({ name: "", email: "" });
  const [profile, setProfile] = useState(blankProfile);
  const [articles, setArticles] = useState<ArticleDraft[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [calendar, setCalendar] = useState<CalendarSettings>(defaultCalendar);
  const [article, setArticle] = useState(blankArticle);
  const [status, setStatus] = useState("Loading your workspace…");
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    message: string;
    href?: string;
  } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [articleSaving, setArticleSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/account");
    if (response.status === 401) {
      router.push("/lawyer/account");
      return;
    }
    const data = await response.json();
    setAccount(data.account);
    setArticles(data.articles || []);
    setInquiries(data.inquiries || []);
    if (data.calendar)
      setCalendar({
        ...defaultCalendar,
        ...data.calendar,
        weekly_hours:
          data.calendar.weekly_hours || defaultCalendar.weekly_hours,
      });
    if (data.articles?.length)
      setArticle((current) =>
        current.title
          ? current
          : { ...data.articles[0], content: data.articles[0].content || [] },
      );
    if (data.profile)
      setProfile({
        ...data.profile,
        reasons: data.profile.reasons || [],
        tags: data.profile.tags || [],
        awards: data.profile.awards || [],
        services: data.profile.services || [],
        first_consultation_price_cents:
          data.profile.first_consultation_price_cents ?? null,
        consultation_currency: data.profile.consultation_currency || "EUR",
        first_consultation_free: data.profile.first_consultation_free || false,
        photo_settings: data.profile.photo_settings || {
          position: 50,
          zoom: 100,
        },
        cover_settings: data.profile.cover_settings || {
          position: 50,
          zoom: 100,
        },
      });
    else setProfile((current) => ({ ...current, name: data.account.name }));
    setStatus("");
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const completeness = useMemo(
    () =>
      Math.round(
        ([
          profile.name,
          profile.specialty,
          profile.practice,
          profile.location,
          profile.languages,
          profile.price,
          profile.availability,
          profile.bio,
          profile.experience,
          profile.tags.length,
        ].filter(Boolean).length /
          10) *
          100,
      ),
    [profile],
  );
  const update = (
    key: keyof Profile,
    value:
      | string
      | boolean
      | number
      | null
      | string[]
      | { x?: number; y?: number; position?: number; zoom: number },
  ) => setProfile((current) => ({ ...current, [key]: value }));

  async function saveProfile(publish = profile.published) {
    setProfileSaving(true);
    setNotice(null);
    setStatus(publish ? "Publishing profile…" : "Saving profile…");
    try {
      const response = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          published: publish,
          reasons: profile.reasons.join(", "),
          tags: profile.tags.join(", "),
          awards: profile.awards.join(", "),
          services: profile.services.join(", "),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error || "Could not save profile.");
        setNotice({
          kind: "error",
          message: data.error || "Could not save profile.",
        });
        return;
      }
      setProfile({
        ...data.profile,
        reasons: data.profile.reasons || [],
        tags: data.profile.tags || [],
        awards: data.profile.awards || [],
        services: data.profile.services || [],
        photo_settings: data.profile.photo_settings || {
          position: 50,
          zoom: 100,
        },
        cover_settings: data.profile.cover_settings || {
          position: 50,
          zoom: 100,
        },
      });
      setStatus(publish ? "Profile published ✓" : "All changes saved ✓");
      setNotice({
        kind: "success",
        message: publish ? "Your profile is live." : "Profile draft saved.",
        href: publish ? `/lawyers/${data.profile.slug}` : undefined,
      });
    } catch {
      setStatus("Could not save profile.");
      setNotice({
        kind: "error",
        message:
          "The profile could not be saved. Check your connection and try again.",
      });
    } finally {
      setProfileSaving(false);
    }
  }
  async function saveArticle(publish = article.published) {
    setArticleSaving(true);
    setNotice(null);
    setStatus(publish ? "Publishing article…" : "Saving draft…");
    try {
      const response = await fetch("/api/account/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...article, published: publish }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error || "Could not save article.");
        setNotice({
          kind: "error",
          message: data.error || "Could not save article.",
        });
        return;
      }
      setArticle(data.article);
      setStatus(publish ? "Article published ✓" : "Draft saved ✓");
      setNotice({
        kind: "success",
        message: publish ? "Your article is live." : "Article draft saved.",
        href: publish ? `/articles/${data.article.slug}` : undefined,
      });
      await load();
    } catch {
      setStatus("Could not save article.");
      setNotice({
        kind: "error",
        message:
          "The article could not be saved. Add a title and content, then try again.",
      });
    } finally {
      setArticleSaving(false);
    }
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function respondToInquiry(
    id: string,
    nextStatus: Inquiry["status"],
    note = "",
  ) {
    const response = await fetch(`/api/account/inquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, note }),
    });
    const data = await response.json();
    if (!response.ok) {
      setNotice({
        kind: "error",
        message: data.error || "The inquiry could not be updated.",
      });
      return;
    }
    setInquiries((current) =>
      current.map((item) =>
        item.id === id ? { ...item, ...data.inquiry } : item,
      ),
    );
    setNotice({
      kind: "success",
      message:
        nextStatus === "accepted"
          ? data.inquiry?.status === "payment_pending"
            ? "Demande validée. Le client peut maintenant payer pour confirmer la consultation."
            : "Demande validée et consultation confirmée."
          : nextStatus === "declined"
            ? "Demande refusée. Le client en retrouvera le statut dans son espace."
            : nextStatus === "completed"
              ? "Consultation marquée comme terminée."
              : "Demande de précision envoyée au client.",
    });
  }

  if (status === "Loading your workspace…") return <LoadingScreen />;

  return (
    <main className="dashboard-shell">
      {notice ? (
        <div className={`publish-toast ${notice.kind}`} role="status">
          <span>{notice.kind === "success" ? "✓" : "!"}</span>
          <div>
            <strong>{notice.message}</strong>
            {notice.href ? (
              <Link href={notice.href}>View live page →</Link>
            ) : null}
          </div>
          <button onClick={() => setNotice(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ) : null}
      <aside className="dashboard-nav">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true" />
          <span>repere</span>
        </Link>
        <div className="account-mini">
          <span>
            {account.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2) || "L"}
          </span>
          <div>
            <strong>{account.name || "Lawyer"}</strong>
            <small>{account.email}</small>
          </div>
        </div>
        <nav>
          <button
            className={tab === "overview" ? "active" : ""}
            onClick={() => setTab("overview")}
          >
            Overview
          </button>
          <button
            className={tab === "inquiries" ? "active" : ""}
            onClick={() => setTab("inquiries")}
          >
            Inquiries{" "}
            <span>
              {inquiries.filter((item) => item.status === "pending" || item.status === "clarification_requested").length}
            </span>
          </button>
          <button
            className={tab === "profile" ? "active" : ""}
            onClick={() => setTab("profile")}
          >
            Public profile
          </button>
          <button
            className={tab === "calendar" ? "active" : ""}
            onClick={() => setTab("calendar")}
          >
            Calendar
          </button>
          <button
            className={tab === "settings" ? "active" : ""}
            onClick={() => setTab("settings")}
          >
            Settings
          </button>
          <button
            className={tab === "articles" ? "active" : ""}
            onClick={() => setTab("articles")}
          >
            Articles <span>{articles.length}</span>
          </button>
        </nav>
        <button className="logout-button" onClick={logout}>
          Sign out
        </button>
      </aside>
      <section className="dashboard-content">
        <header>
          <div>
            <p className="section-kicker">Lawyer workspace</p>
            <h1>
              {tab === "overview"
                ? `Good to see you, ${account.name.split(" ")[0] || "there"}.`
                : tab === "inquiries"
                  ? "Review new client briefs."
                  : tab === "profile"
                    ? "Design your profile."
                    : tab === "calendar"
                      ? "Your meetings at a glance."
                      : tab === "settings"
                        ? "Manage availability and connections."
                        : "Share your expertise."}
            </h1>
          </div>
          <div className="save-state">
            {status || "Your work saves to your account"}
          </div>
        </header>
        {tab === "overview" && (
          <div className="overview-grid">
            <article className="metric-card main">
              <span>Profile strength</span>
              <strong>{completeness}%</strong>
              <div>
                <i style={{ width: `${completeness}%` }} />
              </div>
              <p>
                {completeness < 80
                  ? "Add more detail to help clients understand why you are the right fit."
                  : "Your profile gives clients a strong view of your practice."}
              </p>
              <button onClick={() => setTab("profile")}>
                Improve profile →
              </button>
            </article>
            <article className="metric-card">
              <span>Visibility</span>
              <strong>{profile.published ? "Live" : "Draft"}</strong>
              <p>
                {profile.published
                  ? "Your profile can appear in relevant client matches."
                  : "Publish when your profile is ready for clients."}
              </p>
            </article>
            <article className="metric-card">
              <span>Insights</span>
              <strong>{articles.filter((a) => a.published).length}</strong>
              <p>
                Published articles help clients understand your point of view.
              </p>
              <button onClick={() => setTab("articles")}>
                Write an article →
              </button>
            </article>
            <article className="workspace-card">
              <p className="section-kicker">Your public card</p>
              <ProfilePreview profile={profile} />
            </article>
            <article className="workspace-card">
              <p className="section-kicker">Latest writing</p>
              {articles.length ? (
                articles.slice(0, 3).map((item) => (
                  <button
                    className="article-row"
                    key={item.id}
                    onClick={() => {
                      setArticle(item);
                      setTab("articles");
                    }}
                  >
                    <span>{item.published ? "Published" : "Draft"}</span>
                    <strong>{item.title}</strong>
                    <small>
                      {item.updated_at
                        ? new Date(item.updated_at).toLocaleDateString()
                        : "Recently edited"}
                    </small>
                  </button>
                ))
              ) : (
                <div className="empty-state">
                  <strong>No articles yet</strong>
                  <p>
                    Turn questions you answer every day into useful guidance.
                  </p>
                  <button onClick={() => setTab("articles")}>
                    Start writing →
                  </button>
                </div>
              )}
            </article>
          </div>
        )}
        {tab === "inquiries" && (
          <InquiryInbox inquiries={inquiries} onRespond={respondToInquiry} />
        )}
        {tab === "profile" && (
          <div className="editor-layout">
            <div className="profile-editor">
              <ProfileResearchAssistant profile={profile} setProfile={setProfile} />
              <EditorSection
                number="00"
                title="Visual identity"
                copy="Add a professional portrait and a cover that feels like your practice."
              >
                <div className="profile-media-row">
                  <MediaUpload
                    label="Portrait"
                    purpose="portrait"
                    shape="portrait"
                    value={profile.profile_photo_url}
                    onChange={(url) => update("profile_photo_url", url)}
                    settings={profile.photo_settings}
                    onSettings={(settings) =>
                      update("photo_settings", settings)
                    }
                  />
                  <MediaUpload
                    label="Profile cover"
                    purpose="profile-cover"
                    value={profile.cover_photo_url}
                    onChange={(url) => update("cover_photo_url", url)}
                    settings={profile.cover_settings}
                    onSettings={(settings) =>
                      update("cover_settings", settings)
                    }
                  />
                </div>
              </EditorSection>
              <EditorSection
                number="01"
                title="Identity"
                copy="How clients recognize your practice."
              >
                <Field
                  label="Full name"
                  value={profile.name}
                  onChange={(v) => update("name", v)}
                />
                <Field
                  label="Professional title"
                  value={profile.specialty}
                  onChange={(v) => update("specialty", v)}
                />
                <Field
                  label="Primary practice area"
                  value={profile.practice}
                  onChange={(v) => update("practice", v)}
                />
                <Field
                  label="Location"
                  value={profile.location}
                  onChange={(v) => update("location", v)}
                />
                <Field
                  label="Practice or firm name"
                  value={profile.firm_name}
                  onChange={(v) => update("firm_name", v)}
                />
                <Field
                  label="Profile tagline"
                  value={profile.tagline}
                  onChange={(v) => update("tagline", v)}
                />
              </EditorSection>
              <EditorSection
                number="02"
                title="Your expertise"
                copy="Specific detail improves matching."
              >
                <Field
                  label="Areas of expertise (comma separated)"
                  value={profile.tags.join(", ")}
                  onChange={(v) =>
                    update(
                      "tags",
                      v
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    )
                  }
                />
                <Field
                  label="Experience"
                  value={profile.experience}
                  onChange={(v) => update("experience", v)}
                />
                <Field
                  label="Credentials"
                  value={profile.credentials}
                  onChange={(v) => update("credentials", v)}
                />
                <Field
                  label="Languages"
                  value={profile.languages}
                  onChange={(v) => update("languages", v)}
                />
                <Field
                  label="Education"
                  value={profile.education}
                  onChange={(v) => update("education", v)}
                />
                <Field
                  label="Awards & recognition (comma separated)"
                  value={profile.awards.join(", ")}
                  onChange={(v) =>
                    update(
                      "awards",
                      v
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    )
                  }
                />
              </EditorSection>
              <EditorSection
                number="03"
                title="Client experience"
                copy="Set expectations before the first call."
              >
                <Field
                  label="Professional introduction"
                  area
                  value={profile.bio}
                  onChange={(v) => update("bio", v)}
                />
                <Field
                  label="Why clients choose you (comma separated)"
                  value={profile.reasons.join(", ")}
                  onChange={(v) =>
                    update(
                      "reasons",
                      v
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    )
                  }
                />
                <label>
                  First consultation price
                  <div className="price-input-row">
                    <select
                      value={profile.consultation_currency}
                      onChange={(event) =>
                        update("consultation_currency", event.target.value)
                      }
                      disabled={profile.first_consultation_free}
                    >
                      {["EUR", "CHF", "GBP", "USD"].map((currency) => (
                        <option key={currency}>{currency}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="150"
                      disabled={profile.first_consultation_free}
                      value={
                        profile.first_consultation_price_cents == null
                          ? ""
                          : profile.first_consultation_price_cents / 100
                      }
                      onChange={(event) =>
                        update(
                          "first_consultation_price_cents",
                          event.target.value
                            ? Math.round(Number(event.target.value) * 100)
                            : null,
                        )
                      }
                    />
                  </div>
                  <small>
                    This will be the amount prepaid through Stripe later.
                  </small>
                </label>
                <label className="free-consultation-toggle">
                  <input
                    type="checkbox"
                    checked={profile.first_consultation_free}
                    onChange={(event) =>
                      update("first_consultation_free", event.target.checked)
                    }
                  />
                  First consultation is free
                </label>
                <Field
                  label="Availability"
                  value={profile.availability}
                  onChange={(v) => update("availability", v)}
                />
                <Field
                  label="Services offered (comma separated)"
                  value={profile.services.join(", ")}
                  onChange={(v) =>
                    update(
                      "services",
                      v
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    )
                  }
                />
                <Field
                  label="Consultation format"
                  value={profile.consultation_format}
                  onChange={(v) => update("consultation_format", v)}
                />
                <Field
                  label="Website"
                  value={profile.website}
                  onChange={(v) => update("website", v)}
                />
                <Field
                  label="LinkedIn"
                  value={profile.linkedin}
                  onChange={(v) => update("linkedin", v)}
                />
              </EditorSection>
              <div className="editor-actions">
                <button
                  className="card-button"
                  onClick={() => saveProfile(false)}
                  disabled={profileSaving}
                >
                  Save draft
                </button>
                <button
                  className="primary-button compact"
                  onClick={() => saveProfile(true)}
                  disabled={profileSaving}
                >
                  {profileSaving
                    ? "Publishing…"
                    : profile.published
                      ? "Update published profile"
                      : "Publish profile"}
                  <span>→</span>
                </button>
              </div>
            </div>
            <aside className="sticky-preview">
              <p className="preview-label">Live profile preview</p>
              <ProfilePreview profile={profile} />
            </aside>
          </div>
        )}
        {tab === "calendar" && (
          <CalendarAgenda
            inquiries={inquiries}
            settings={calendar}
            onRespond={respondToInquiry}
          />
        )}
        {tab === "settings" && (
          <CalendarEditor
            settings={calendar}
            setSettings={setCalendar}
            setNotice={setNotice}
          />
        )}
        {tab === "articles" && (
          <ArticleStudio
            article={article}
            setArticle={setArticle}
            articles={articles}
            onSave={saveArticle}
            saving={articleSaving}
          />
        )}
      </section>
    </main>
  );
}

function CalendarAgenda({
  inquiries,
  settings,
  onRespond,
}: {
  inquiries: Inquiry[];
  settings: CalendarSettings;
  onRespond: (
    id: string,
    status: Inquiry["status"],
    note?: string,
  ) => Promise<void>;
}) {
  const [busyEvents, setBusyEvents] = useState<
    Array<{ start: string; end: string; type: "busy" }>
  >([]);
  const [sync, setSync] = useState<{
    ok: boolean;
    message: string;
    checkedAt: string;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const week = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date;
  });

  async function refreshCalendar() {
    setRefreshing(true);
    fetch("/api/account/calendar")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        setBusyEvents(data.events || []);
        setSync(data.sync || null);
      })
      .catch(() => {
        setBusyEvents([]);
        setSync({
          ok: false,
          message: "Calendar could not be refreshed.",
          checkedAt: new Date().toISOString(),
        });
      })
      .finally(() => setRefreshing(false));
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshCalendar(), 0);
    return () => window.clearTimeout(timer);
  }, [settings.enabled, settings.ical_url]);

  const isSameDay = (value: string, day: Date) => {
    const date = new Date(value);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toDateString() === day.toDateString()
    );
  };

  return (
    <section className="calendar-card calendar-agenda-card">
      <div className="calendar-agenda-heading">
        <div>
          <p className="section-kicker">Your week</p>
          <h2>Calendar preview</h2>
        </div>
        <div className="calendar-legend">
          <span className="busy">Connected calendar</span>
          <span className="pending">Needs review</span>
          <span className="accepted">Accepted meeting</span>
        </div>
      </div>
      <div
        className={`calendar-sync-status ${sync?.ok ? "connected" : "error"}`}
      >
        <div>
          <strong>
            {sync?.ok ? "Calendar connected" : "Calendar needs attention"}
          </strong>
          <span>{sync?.message || "Checking your connected calendar…"}</span>
        </div>
        <button onClick={() => void refreshCalendar()} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh calendar"}
        </button>
      </div>
      <div className="week-calendar">
        {week.map((day, index) => {
          const busy = busyEvents.filter((event) =>
            isSameDay(event.start, day),
          );
          const meetings = inquiries.filter((inquiry) =>
            isSameDay(inquiry.meeting_start || inquiry.meeting_time, day),
          );
          return (
            <div className="calendar-day" key={day.toISOString()}>
              <header className={index === 0 ? "today" : ""}>
                <span>
                  {day.toLocaleDateString("en", { weekday: "short" })}
                </span>
                <strong>{day.getDate()}</strong>
              </header>
              <div>
                {busy.map((event) => (
                  <article className="calendar-event busy" key={event.start}>
                    <small>
                      {new Date(event.start).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                    <strong>Busy</strong>
                  </article>
                ))}
                {meetings.map((inquiry) => (
                  <button
                    className={`calendar-event ${inquiry.status}`}
                    key={inquiry.id}
                    onClick={() => setSelected(inquiry)}
                  >
                    <small>{inquiry.meeting_time}</small>
                    <strong>{inquiry.client_name}</strong>
                    <span>{inquiryStatusLabel(inquiry.status)}</span>
                  </button>
                ))}
                {!busy.length && !meetings.length ? (
                  <small className="calendar-free">Open</small>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {selected ? (
        <div className="calendar-event-preview">
          <button
            aria-label="Close meeting preview"
            onClick={() => setSelected(null)}
          >
            ×
          </button>
          <div>
            <span className={`inquiry-status ${selected.status}`}>
              {inquiryStatusLabel(selected.status)}
            </span>
            <h3>
              {selected.client_name} · {selected.brief.practice}
            </h3>
            <p>{selected.brief.summary}</p>
            <small>
              {selected.meeting_time} · {selected.brief.meetingFormat}
            </small>
          </div>
          {selected.status === "pending" ? (
            <div className="calendar-preview-actions">
              <button
                className="decline-button"
                onClick={() => void onRespond(selected.id, "declined")}
              >
                Refuser
              </button>
              <button
                className="primary-button compact"
                onClick={async () => {
                  await onRespond(selected.id, "accepted");
                  setSelected({ ...selected, status: selected.payment_amount_cents ? "payment_pending" : "confirmed" });
                }}
              >
                Valider la demande <span>→</span>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function CalendarEditor({
  settings,
  setSettings,
  setNotice,
}: {
  settings: CalendarSettings;
  setSettings: (settings: CalendarSettings) => void;
  setNotice: (notice: { kind: "success" | "error"; message: string }) => void;
}) {
  const [saving, setSaving] = useState(false);
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  async function save() {
    setSaving(true);
    const response = await fetch("/api/account/calendar", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setNotice({
        kind: "error",
        message: data.error || "Calendar could not be saved.",
      });
      return;
    }
    setSettings({ ...settings, ...(data.settings || {}) });
    setNotice({
      kind: "success",
      message: "Calendar and booking hours saved.",
    });
  }

  return (
    <div className="calendar-editor">
      <section className="calendar-card calendar-intro">
        <p className="section-kicker">Calendar connection</p>
        <h2>Only show times when you are genuinely free.</h2>
        <p>
          Repere lit votre flux iCalendar privé afin d’exclure les périodes occupées. Le
          feed address stays on the server and is never shown to clients.
        </p>
        <div className="provider-grid">
          {["google", "apple", "outlook", "ical"].map((provider) => (
            <button
              key={provider}
              className={settings.provider === provider ? "selected" : ""}
              onClick={() => setSettings({ ...settings, provider })}
            >
              {provider === "ical"
                ? "Other iCalendar"
                : provider[0].toUpperCase() + provider.slice(1)}
            </button>
          ))}
        </div>
        <label>
          Private iCalendar (.ics) address
          <input
            type="password"
            placeholder="https://…/calendar.ics"
            value={settings.ical_url}
            onChange={(event) =>
              setSettings({ ...settings, ical_url: event.target.value })
            }
          />
        </label>
        <small>
          Google: Calendar settings → Integrate calendar → Secret address in
          iCal format. Apple and Outlook: paste a private or published ICS link.
        </small>
      </section>

      <section className="calendar-card">
        <p className="section-kicker">Booking rules</p>
        <div className="calendar-grid">
          <label>
            Time zone
            <input
              value={settings.timezone}
              onChange={(event) =>
                setSettings({ ...settings, timezone: event.target.value })
              }
            />
          </label>
          <label>
            Consultation length
            <select
              value={settings.duration_minutes}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  duration_minutes: Number(event.target.value),
                })
              }
            >
              {[30, 45, 60, 90].map((value) => (
                <option key={value} value={value}>
                  {value} minutes
                </option>
              ))}
            </select>
          </label>
          <label>
            Buffer between meetings
            <select
              value={settings.buffer_minutes}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  buffer_minutes: Number(event.target.value),
                })
              }
            >
              {[0, 10, 15, 30].map((value) => (
                <option key={value} value={value}>
                  {value} minutes
                </option>
              ))}
            </select>
          </label>
          <label>
            Book up to
            <select
              value={settings.booking_days_ahead}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  booking_days_ahead: Number(event.target.value),
                })
              }
            >
              {[7, 14, 21, 30, 60].map((value) => (
                <option key={value} value={value}>
                  {value} days ahead
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="calendar-card">
        <p className="section-kicker">Your open hours</p>
        <div className="hours-list">
          {days.map((day) => {
            const hours = settings.weekly_hours[day];
            return (
              <div className="hours-row" key={day}>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(hours)}
                    onChange={(event) => {
                      const weekly_hours = { ...settings.weekly_hours };
                      if (event.target.checked)
                        weekly_hours[day] = ["09:00", "17:00"];
                      else delete weekly_hours[day];
                      setSettings({ ...settings, weekly_hours });
                    }}
                  />
                  <strong>{day[0].toUpperCase() + day.slice(1)}</strong>
                </label>
                {hours ? (
                  <>
                    <input
                      type="time"
                      value={hours[0]}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          weekly_hours: {
                            ...settings.weekly_hours,
                            [day]: [event.target.value, hours[1]],
                          },
                        })
                      }
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={hours[1]}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          weekly_hours: {
                            ...settings.weekly_hours,
                            [day]: [hours[0], event.target.value],
                          },
                        })
                      }
                    />
                  </>
                ) : (
                  <small>Unavailable</small>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="calendar-publish">
        <div className="calendar-enabled-control">
          <input
            id="calendar-enabled"
            aria-label="Offer these times to clients"
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) =>
              setSettings({ ...settings, enabled: event.target.checked })
            }
          />
          <span>
            <strong>Offer these times to clients</strong>
            <small>
              Busy events in your connected calendar are automatically excluded.
            </small>
          </span>
        </div>
        <button
          className="primary-button compact"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save availability"}
          <span>→</span>
        </button>
      </section>
    </div>
  );
}

function InquiryInbox({
  inquiries,
  onRespond,
}: {
  inquiries: Inquiry[];
  onRespond: (
    id: string,
    status: Inquiry["status"],
    note?: string,
  ) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState(inquiries[0]?.id || "");
  const [note, setNote] = useState("");
  const selected =
    inquiries.find((item) => item.id === selectedId) || inquiries[0];

  if (!selected)
    return (
      <div className="inquiry-empty">
        <span>✓</span>
        <h2>Aucune demande à traiter.</h2>
        <p>
          Les nouvelles demandes apparaîtront ici avec une synthèse structurée
          et un créneau proposé.
        </p>
      </div>
    );

  return (
    <div className="inquiry-workspace">
      <aside className="inquiry-list">
        <div>
          <p className="section-kicker">Demandes clients</p>
          <small>{inquiries.length} au total</small>
        </div>
        {inquiries.map((item) => (
          <button
            key={item.id}
            className={item.id === selected.id ? "selected" : ""}
            onClick={() => {
              setSelectedId(item.id);
              setNote(item.lawyer_note || "");
            }}
          >
            <span className={`inquiry-status ${item.status}`}>
              {inquiryStatusLabel(item.status)}
            </span>
            <strong>{item.client_name}</strong>
            <small>
              {item.brief.practice} · {item.brief.urgency}
            </small>
          </button>
        ))}
      </aside>
      <section className="case-brief-panel">
        <header>
          <div>
            <p className="section-kicker">Synthèse du dossier</p>
            <h2>{selected.brief.practice}</h2>
            <p>
              {selected.client_name} · {selected.client_email}
            </p>
          </div>
          <span
            className={`brief-urgency ${selected.brief.urgency.toLowerCase().replace("-", "")}`}
          >
            {selected.brief.urgency}
          </span>
        </header>
        <div className="brief-summary">
          <small>Situation</small>
          {selected.brief.dispute ? (
            <strong>{selected.brief.dispute}</strong>
          ) : null}
          <p>{selected.brief.summary}</p>
        </div>
        {selected.brief.conversation?.length ? (
          <div className="lawyer-conversation">
            <small>Conversation complète avec Repere</small>
            {selected.brief.conversation.map((message, index) => (
              <div className={message.role} key={`${message.role}-${index}`}>
                <strong>
                  {message.role === "assistant" ? "Repere" : selected.client_name}
                </strong>
                <p>{message.content}</p>
              </div>
            ))}
          </div>
        ) : null}
        <div className="brief-facts">
          <div>
            <small>Juridiction</small>
            <strong>{selected.brief.jurisdiction}</strong>
          </div>
          <div>
            <small>Échéance</small>
            <strong>{selected.brief.deadline}</strong>
          </div>
          <div>
            <small>Objectif du client</small>
            <strong>{selected.brief.desiredOutcome}</strong>
          </div>
          <div>
            <small>Rendez-vous</small>
            <strong>{selected.meeting_time}</strong>
          </div>
          <div>
            <small>Langue</small>
            <strong>{selected.brief.language}</strong>
          </div>
          <div>
            <small>Format</small>
            <strong>{selected.brief.meetingFormat}</strong>
          </div>
        </div>
        <div className="brief-lists">
          <div>
            <small>Parties concernées</small>
            <p>{selected.brief.parties}</p>
          </div>
          <div>
            <small>Points restant à préciser</small>
            <ul>
              {(selected.brief.missingInformation || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        {selected.status === "pending" || selected.status === "clarification_requested" ? (
          <div className="inquiry-response">
            <label>
              Note facultative
              <textarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Posez une question précise ou ajoutez une note au client."
              />
            </label>
            <div>
              <button
                className="decline-button"
                onClick={() => void onRespond(selected.id, "declined", note)}
              >
                Refuser
              </button>
              <button
                className="card-button"
                onClick={() =>
                  void onRespond(selected.id, "clarification_requested", note)
                }
              >
                Demander une précision
              </button>
              <button
                className="primary-button compact"
                onClick={() => void onRespond(selected.id, "accepted", note)}
              >
                Valider la demande <span>→</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="response-complete">
            <strong>
              {inquiryStatusLabel(selected.status)}
            </strong>
            {selected.lawyer_note ? <p>{selected.lawyer_note}</p> : null}
          </div>
        )}
        <Link className="matter-open-link" href={`/matters/${selected.id}`}>
          Ouvrir le dossier partagé <span>→</span>
        </Link>
      </section>
    </div>
  );
}

type ProfileResearchDraft = Pick<
  Profile,
  | "name"
  | "specialty"
  | "practice"
  | "location"
  | "firm_name"
  | "tagline"
  | "languages"
  | "tags"
  | "experience"
  | "credentials"
  | "education"
  | "awards"
  | "services"
  | "bio"
  | "reasons"
  | "website"
  | "linkedin"
  | "consultation_format"
> & {
  confidence: "high" | "medium" | "low";
  identityNote: string;
  unsupportedClaims: string[];
};

function ProfileResearchAssistant({
  profile,
  setProfile,
}: {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
}) {
  const [details, setDetails] = useState({
    name: profile.name,
    firm: profile.firm_name,
    location: profile.location === "Remote" ? "" : profile.location,
    website: profile.website,
    linkedin: profile.linkedin,
  });
  const [draft, setDraft] = useState<ProfileResearchDraft | null>(null);
  const [sources, setSources] = useState<Array<{ title: string; url: string; domain: string }>>([]);
  const [researching, setResearching] = useState(false);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [researchError, setResearchError] = useState("");

  async function researchProfile() {
    setResearching(true);
    setResearchError("");
    setDraft(null);
    try {
      const response = await fetch("/api/account/profile/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...details, confirmIdentity: identityConfirmed }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Research could not be completed.");
      setDraft(result.draft);
      setSources(result.sources || []);
    } catch (error) {
      setResearchError(error instanceof Error ? error.message : "Research could not be completed.");
    } finally {
      setResearching(false);
    }
  }

  function applyDraft() {
    if (!draft) return;
    setProfile((current) => ({
      ...current,
      name: draft.name || current.name,
      specialty: draft.specialty || current.specialty,
      practice: draft.practice || current.practice,
      location: draft.location || current.location,
      firm_name: draft.firm_name || current.firm_name,
      tagline: draft.tagline || current.tagline,
      languages: draft.languages || current.languages,
      tags: draft.tags.length ? draft.tags : current.tags,
      experience: draft.experience || current.experience,
      credentials: draft.credentials || current.credentials,
      education: draft.education || current.education,
      awards: draft.awards.length ? draft.awards : current.awards,
      services: draft.services.length ? draft.services : current.services,
      bio: draft.bio || current.bio,
      reasons: draft.reasons.length ? draft.reasons : current.reasons,
      website: draft.website || current.website,
      linkedin: draft.linkedin || current.linkedin,
      consultation_format: draft.consultation_format || current.consultation_format,
    }));
    setDraft(null);
    setSources([]);
  }

  return (
    <section className="profile-research-card">
      <div className="profile-research-heading">
        <div>
          <span className="ai-pill">AI profile researcher</span>
          <h2>Laissez Repere préparer votre première version</h2>
          <p>Repere consulte les sources professionnelles publiques et transforme les informations vérifiées en champs modifiables.</p>
        </div>
        <span className="research-step">00</span>
      </div>
      <div className="profile-research-fields">
        <label>Professional name<input value={details.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} /></label>
        <label>Firm or organisation<input value={details.firm} onChange={(event) => setDetails({ ...details, firm: event.target.value })} placeholder="Helps distinguish similar names" /></label>
        <label>City or jurisdiction<input value={details.location} onChange={(event) => setDetails({ ...details, location: event.target.value })} /></label>
        <label>Official profile or website<input type="url" value={details.website} onChange={(event) => setDetails({ ...details, website: event.target.value })} placeholder="https://…" /></label>
        <label className="wide">LinkedIn (optional)<input type="url" value={details.linkedin} onChange={(event) => setDetails({ ...details, linkedin: event.target.value })} placeholder="https://linkedin.com/in/…" /></label>
      </div>
      <div className="profile-research-actions">
        <label className="research-confirmation"><input type="checkbox" checked={identityConfirmed} onChange={(event) => setIdentityConfirmed(event.target.checked)} />I confirm this is my own professional identity and public profile.</label>
        <button className="primary-button compact" onClick={() => void researchProfile()} disabled={researching || details.name.trim().length < 4 || !identityConfirmed}>
          {researching ? "Researching public sources…" : "Research and draft my profile"}<span>→</span>
        </button>
        <small>Uses public professional information only. Nothing is saved or published until you review it.</small>
      </div>
      {researchError ? <p className="profile-research-error" role="alert">{researchError}</p> : null}
      {draft ? (
        <div className="profile-research-result">
          <header>
            <div><span>{draft.confidence} identity confidence</span><strong>{draft.specialty}</strong><small>{draft.identityNote}</small></div>
            <button className="primary-button compact" onClick={applyDraft}>Apply this draft <span>→</span></button>
          </header>
          <p>{draft.bio}</p>
          <div className="research-tags">{draft.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          {sources.length ? <div className="research-sources"><small>Sources checked</small>{sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.title || source.domain}<span>↗</span></a>)}</div> : null}
          {draft.unsupportedClaims.length ? <details><summary>Information still requiring your confirmation</summary><ul>{draft.unsupportedClaims.map((claim) => <li key={claim}>{claim}</li>)}</ul></details> : null}
        </div>
      ) : null}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  area = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  area?: boolean;
}) {
  return (
    <label>
      {label}
      {area ? (
        <textarea
          rows={5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
function EditorSection({
  number,
  title,
  copy,
  children,
}: {
  number: string;
  title: string;
  copy: string;
  children: React.ReactNode;
}) {
  return (
    <section className="editor-section">
      <div className="editor-title">
        <span>{number}</span>
        <div>
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
      </div>
      <div className="editor-fields">{children}</div>
    </section>
  );
}
function ProfilePreview({ profile }: { profile: Profile }) {
  return (
    <div className="dashboard-profile-card">
      {profile.cover_photo_url ? (
        <div className="preview-cover">
          <Image
            src={profile.cover_photo_url}
            alt=""
            fill
            sizes="360px"
            style={{
              objectPosition: `${profile.cover_settings.x ?? 50}% ${profile.cover_settings.y ?? profile.cover_settings.position ?? 50}%`,
              transform: `scale(${profile.cover_settings.zoom / 100})`,
            }}
            unoptimized
          />
        </div>
      ) : null}
      <div className="profile-head">
        {profile.profile_photo_url ? (
          <Image
            className="avatar large profile-preview-photo"
            src={profile.profile_photo_url}
            alt={profile.name}
            width={55}
            height={55}
            style={{
              objectPosition: `${profile.photo_settings.x ?? 50}% ${profile.photo_settings.y ?? profile.photo_settings.position ?? 50}%`,
              transform: `scale(${profile.photo_settings.zoom / 100})`,
            }}
            unoptimized
          />
        ) : (
          <div className={`avatar ${profile.accent} large`}>
            {profile.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2) || "ME"}
          </div>
        )}
        <div>
          <h2>{profile.name || "Your name"}</h2>
          <p>{profile.specialty || "Your professional title"}</p>
        </div>
        <span className="verified">{profile.published ? "Live" : "Draft"}</span>
      </div>
      <p className="bio">
        {profile.tagline ? (
          <strong className="preview-tagline">{profile.tagline}</strong>
        ) : null}
        {profile.bio || "Your professional introduction will appear here."}
      </p>
      <div className="profile-tags">
        {profile.tags.length ? (
          profile.tags.map((tag) => <span key={tag}>{tag}</span>)
        ) : (
          <span>Expertise</span>
        )}
      </div>
      <div className="profile-facts">
        <div>
          <small>Experience</small>
          <strong>{profile.experience || "Add details"}</strong>
        </div>
        <div>
          <small>Languages</small>
          <strong>{profile.languages}</strong>
        </div>
        <div>
          <small>Consultation</small>
          <strong>{formatConsultationPrice(profile)}</strong>
        </div>
      </div>
    </div>
  );
}
