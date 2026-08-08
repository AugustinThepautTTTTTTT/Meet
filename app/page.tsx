"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Practice =
  | "Employment"
  | "Family"
  | "Housing"
  | "Business"
  | "Immigration"
  | "Criminal"
  | "Injury"
  | "Estates"
  | "Technology";
type Lawyer = {
  slug?: string;
  initials: string;
  name: string;
  specialty: string;
  practice: Practice;
  location: string;
  languages: string;
  match: number;
  price: string;
  availability: string;
  accent: string;
  reasons: string[];
  bio: string;
  experience: string;
  credentials: string;
  tags: string[];
  post: string;
  keywords: string[];
  profilePhotoUrl?: string;
  coverPhotoUrl?: string;
  tagline?: string;
};

const categories = [
  "Not sure",
  "Employment",
  "Family",
  "Housing",
  "Business",
  "Immigration",
  "Criminal",
  "Something else",
];

const lawyers: Lawyer[] = [
  {
    initials: "AM",
    name: "Ana Martins",
    specialty: "Employment & workplace",
    practice: "Employment",
    location: "Paris",
    languages: "English, French, Portuguese",
    match: 97,
    price: "€180 / consultation",
    availability: "Today at 16:30",
    accent: "coral",
    reasons: ["Unfair dismissal specialist", "Employee-side representation"],
    bio: "I help employees and growing teams resolve workplace disputes with clarity, empathy and a practical plan forward.",
    experience: "12 years",
    credentials: "Paris Bar · Verified",
    tags: ["Dismissal", "Discrimination", "Workplace rights"],
    post: "What to do before signing a termination agreement",
    keywords: [
      "job",
      "employer",
      "fired",
      "dismissed",
      "salary",
      "workplace",
      "harassment",
      "contract",
    ],
  },
  {
    initials: "JL",
    name: "Jonas Lindberg",
    specialty: "Commercial contracts & startups",
    practice: "Business",
    location: "Remote",
    languages: "English, Swedish",
    match: 94,
    price: "€150 / consultation",
    availability: "Tomorrow at 09:00",
    accent: "blue",
    reasons: ["Founder-friendly advice", "Practical, direct approach"],
    bio: "I advise founders and small businesses on contracts, funding, partnerships and the decisions that shape a company’s future.",
    experience: "9 years",
    credentials: "Stockholm Bar · Verified",
    tags: ["Startups", "Contracts", "Shareholders"],
    post: "Five clauses every founder should understand",
    keywords: [
      "startup",
      "founder",
      "company",
      "business",
      "shareholder",
      "investment",
      "commercial",
      "contract",
    ],
  },
  {
    initials: "SK",
    name: "Sarah Khelifi",
    specialty: "Immigration & nationality",
    practice: "Immigration",
    location: "Lyon",
    languages: "English, French, Arabic",
    match: 96,
    price: "First call free",
    availability: "Tomorrow at 14:00",
    accent: "gold",
    reasons: ["Visa and residency specialist", "Multilingual support"],
    bio: "I guide individuals and families through visas, residency, nationality and appeals with calm, transparent advice.",
    experience: "11 years",
    credentials: "Lyon Bar · Verified",
    tags: ["Visas", "Residency", "Citizenship"],
    post: "Preparing a strong residence permit application",
    keywords: [
      "visa",
      "immigration",
      "residency",
      "citizenship",
      "nationality",
      "permit",
      "deportation",
      "asylum",
    ],
  },
  {
    initials: "CD",
    name: "Claire Dubois",
    specialty: "Family & divorce",
    practice: "Family",
    location: "Brussels",
    languages: "English, French, Dutch",
    match: 95,
    price: "€170 / consultation",
    availability: "Today at 18:00",
    accent: "lilac",
    reasons: ["Complex divorce experience", "Calm, mediation-first style"],
    bio: "I help families navigate separation, custody and financial agreements while protecting what matters most.",
    experience: "14 years",
    credentials: "Brussels Bar · Verified",
    tags: ["Divorce", "Custody", "Mediation"],
    post: "How to prepare for a first family mediation",
    keywords: [
      "divorce",
      "separation",
      "custody",
      "child",
      "marriage",
      "alimony",
      "family",
      "partner",
    ],
  },
  {
    initials: "MB",
    name: "Marc Benali",
    specialty: "Housing & tenancy",
    practice: "Housing",
    location: "Marseille",
    languages: "English, French, Arabic",
    match: 93,
    price: "€120 / consultation",
    availability: "Friday at 10:30",
    accent: "mint",
    reasons: ["Tenant rights advocate", "Fast emergency advice"],
    bio: "I represent tenants and property owners in rental disputes, unsafe housing matters and eviction proceedings.",
    experience: "8 years",
    credentials: "Marseille Bar · Verified",
    tags: ["Eviction", "Rent disputes", "Property"],
    post: "What your landlord must do before an eviction",
    keywords: [
      "rent",
      "tenant",
      "landlord",
      "eviction",
      "deposit",
      "apartment",
      "house",
      "property",
      "lease",
    ],
  },
  {
    initials: "SP",
    name: "Sofia Petrov",
    specialty: "Criminal defence",
    practice: "Criminal",
    location: "Berlin",
    languages: "English, German, Bulgarian",
    match: 98,
    price: "€220 / consultation",
    availability: "Available now",
    accent: "rose",
    reasons: ["Urgent defence available", "Trial and investigation experience"],
    bio: "I provide discreet, rigorous defence from the first police interview through trial and appeal.",
    experience: "15 years",
    credentials: "Berlin Bar · Verified",
    tags: ["Police interviews", "Defence", "Appeals"],
    post: "Your rights during a police interview",
    keywords: [
      "police",
      "arrested",
      "criminal",
      "charge",
      "court",
      "investigation",
      "accused",
      "fraud",
    ],
  },
  {
    initials: "EV",
    name: "Elena Varga",
    specialty: "Personal injury",
    practice: "Injury",
    location: "Madrid",
    languages: "English, Spanish, Hungarian",
    match: 92,
    price: "No win, no fee",
    availability: "Tomorrow at 11:00",
    accent: "peach",
    reasons: ["Accident compensation", "No-win, no-fee option"],
    bio: "I help injured people secure fair compensation after accidents, medical mistakes and unsafe working conditions.",
    experience: "10 years",
    credentials: "Madrid Bar · Verified",
    tags: ["Accidents", "Medical injury", "Compensation"],
    post: "Evidence to collect after an accident",
    keywords: [
      "accident",
      "injury",
      "injured",
      "hospital",
      "medical",
      "compensation",
      "insurance",
      "car",
    ],
  },
  {
    initials: "RH",
    name: "Romain Hart",
    specialty: "Wills, probate & estates",
    practice: "Estates",
    location: "London",
    languages: "English, French",
    match: 91,
    price: "€160 / consultation",
    availability: "Monday at 09:30",
    accent: "sage",
    reasons: ["Cross-border estates", "Sensitive, clear guidance"],
    bio: "I make estate planning understandable and support families through probate and inheritance disputes.",
    experience: "13 years",
    credentials: "Solicitor · SRA verified",
    tags: ["Wills", "Probate", "Inheritance"],
    post: "When a cross-border will needs updating",
    keywords: [
      "will",
      "inheritance",
      "estate",
      "probate",
      "death",
      "executor",
      "heir",
      "trust",
    ],
  },
  {
    initials: "NK",
    name: "Noor Khan",
    specialty: "Technology, IP & privacy",
    practice: "Technology",
    location: "Amsterdam",
    languages: "English, Dutch, Urdu",
    match: 94,
    price: "€195 / consultation",
    availability: "Thursday at 15:00",
    accent: "sky",
    reasons: ["Product and AI expertise", "Clear commercial thinking"],
    bio: "I work with product teams on intellectual property, privacy, AI governance and technology agreements.",
    experience: "8 years",
    credentials: "Amsterdam Bar · Verified",
    tags: ["Privacy", "AI", "Intellectual property"],
    post: "Who owns work created with generative AI?",
    keywords: [
      "technology",
      "software",
      "privacy",
      "data",
      "trademark",
      "copyright",
      "patent",
      "ai",
      "app",
    ],
  },
];

const practiceKeywords: Record<Practice, string[]> = {
  Employment: [
    "job",
    "employer",
    "fired",
    "dismissed",
    "salary",
    "workplace",
    "harassment",
  ],
  Family: ["divorce", "separation", "custody", "child", "marriage", "family"],
  Housing: ["rent", "tenant", "landlord", "eviction", "deposit", "lease"],
  Business: [
    "startup",
    "founder",
    "company",
    "business",
    "shareholder",
    "investment",
    "commercial",
  ],
  Immigration: [
    "visa",
    "immigration",
    "residency",
    "citizenship",
    "permit",
    "asylum",
  ],
  Criminal: [
    "police",
    "arrested",
    "criminal",
    "charge",
    "court",
    "accused",
    "fraud",
  ],
  Injury: [
    "accident",
    "injury",
    "hospital",
    "medical",
    "compensation",
    "insurance",
  ],
  Estates: ["will", "inheritance", "estate", "probate", "death", "trust"],
  Technology: [
    "technology",
    "software",
    "privacy",
    "data",
    "trademark",
    "copyright",
    "patent",
    "ai",
  ],
};

const examples = [
  [
    "I lost my job",
    "I was dismissed from my job without warning and my employer has not paid my final salary.",
  ],
  [
    "My visa expires",
    "My work visa expires next month and I need help applying for residency.",
  ],
  [
    "I’m getting divorced",
    "My partner and I are separating and we need to agree on custody of our children.",
  ],
  [
    "Landlord dispute",
    "My landlord is keeping my deposit and threatening eviction even though I paid rent.",
  ],
];

const emptyDraft = {
  name: "Alex Morgan",
  title: "Technology & data lawyer",
  city: "Amsterdam · Remote",
  languages: "English, French",
  experience: "8 years",
  fee: "From €175",
  specialties: "Privacy, AI governance, Software contracts",
  approach: "Clear, commercially minded, collaborative",
  bio: "I help ambitious technology companies manage legal risk without slowing down their products or teams.",
  post: "A practical founder’s guide to the EU AI Act",
};

function detectPractice(text: string, selected: string): Practice {
  const lower = text.toLowerCase();
  const scores = Object.entries(practiceKeywords).map(([practice, words]) => ({
    practice: practice as Practice,
    score:
      words.reduce((sum, word) => sum + (lower.includes(word) ? 3 : 0), 0) +
      (selected === practice ? 2 : 0),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0].score
    ? scores[0].practice
    : selected !== "Not sure" && selected !== "Something else"
      ? (selected as Practice)
      : "Business";
}

export default function Home() {
  const [view, setView] = useState<"client" | "lawyer">("client");
  const [category, setCategory] = useState("Not sure");
  const [problem, setProblem] = useState("");
  const [submittedProblem, setSubmittedProblem] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [activeLawyer, setActiveLawyer] = useState<Lawyer | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [lawyerStep, setLawyerStep] = useState<
    "intro" | "prepare" | "draft" | "published"
  >("intro");
  const [draft, setDraft] = useState(emptyDraft);
  const [directoryLawyers, setDirectoryLawyers] = useState(lawyers);
  const [caseStatus, setCaseStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [contact, setContact] = useState({ name: "", email: "", message: "" });
  const [contactStatus, setContactStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [publishStatus, setPublishStatus] = useState<
    "idle" | "publishing" | "error"
  >("idle");

  useEffect(() => {
    fetch("/api/lawyers")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (data.lawyers?.length) setDirectoryLawyers(data.lawyers);
      })
      .catch(() => undefined);
  }, []);

  const detectedPractice = useMemo(
    () => detectPractice(submittedProblem || problem, category),
    [submittedProblem, problem, category],
  );
  const matches = useMemo(
    () =>
      [...directoryLawyers]
        .sort((a, b) => {
          const aScore =
            (a.practice === detectedPractice ? 100 : 0) +
            a.keywords.filter((k) => submittedProblem.toLowerCase().includes(k))
              .length *
              5 +
            a.match;
          const bScore =
            (b.practice === detectedPractice ? 100 : 0) +
            b.keywords.filter((k) => submittedProblem.toLowerCase().includes(k))
              .length *
              5 +
            b.match;
          return bScore - aScore;
        })
        .slice(0, 3),
    [submittedProblem, detectedPractice, directoryLawyers],
  );

  async function findMatches(event: FormEvent) {
    event.preventDefault();
    const description =
      problem.trim() || "I need help understanding a business contract.";
    setSubmittedProblem(description);
    setCaseStatus("saving");
    setTimeout(
      () =>
        document
          .getElementById("matches")
          ?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: description,
          category,
          detectedPractice: detectPractice(description, category),
        }),
      });
      setCaseStatus(response.ok ? "saved" : "error");
    } catch {
      setCaseStatus("error");
    }
  }
  function showProfile(lawyer: Lawyer) {
    setActiveLawyer(lawyer);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function changeDraft(field: keyof typeof emptyDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }
  function openContact(lawyer: Lawyer) {
    setActiveLawyer(lawyer);
    setContact((current) => ({ ...current, message: submittedProblem }));
    setContactStatus("idle");
    setContactOpen(true);
  }
  async function sendContact() {
    if (!activeLawyer) return;
    setContactStatus("sending");
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawyerName: activeLawyer.name,
          clientName: contact.name,
          email: contact.email,
          message: contact.message,
        }),
      });
      if (!response.ok) throw new Error();
      setSelected(activeLawyer.name);
      setContactStatus("sent");
    } catch {
      setContactStatus("error");
    }
  }
  async function publishProfile() {
    setPublishStatus("publishing");
    try {
      const response = await fetch("/api/lawyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) throw new Error();
      const fresh = await fetch("/api/lawyers").then((result) => result.json());
      if (fresh.lawyers?.length) setDirectoryLawyers(fresh.lawyers);
      setPublishStatus("idle");
      setLawyerStep("published");
    } catch {
      setPublishStatus("error");
    }
  }

  return (
    <main>
      <header className="topbar">
        <button
          className="brand brand-button"
          onClick={() => {
            setActiveLawyer(null);
            setView("client");
            setLawyerStep("intro");
          }}
          aria-label="Meet home"
        >
          <span className="brand-mark">M</span>
          <span>meet</span>
        </button>
        <nav aria-label="Main navigation">
          <button
            className={view === "client" ? "nav-link active" : "nav-link"}
            onClick={() => {
              setView("client");
              setActiveLawyer(null);
            }}
          >
            Find a lawyer
          </button>
          <button
            className={view === "lawyer" ? "nav-link active" : "nav-link"}
            onClick={() => {
              setView("lawyer");
              setActiveLawyer(null);
            }}
          >
            For lawyers
          </button>
        </nav>
        <Link className="account-button" href="/lawyer/account">
          Lawyer sign in
        </Link>
      </header>

      {view === "client" && activeLawyer ? (
        <PublicProfile
          lawyer={activeLawyer}
          onBack={() => setActiveLawyer(null)}
          onContact={() => openContact(activeLawyer)}
        />
      ) : view === "client" ? (
        <>
          <section className="hero" id="top">
            <div className="eyebrow">
              <span /> AI-guided legal matching
            </div>
            <h1>
              Tell us what happened.
              <br />
              Meet the right lawyer.
            </h1>
            <p className="hero-copy">
              Describe your situation in your own words. We’ll understand what
              you need and introduce you to lawyers who fit.
            </p>
            <form className="intake-card" onSubmit={findMatches}>
              <label htmlFor="problem">What do you need help with?</label>
              <textarea
                id="problem"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="For example: I’ve been dismissed from my job and I’m not sure the process was fair..."
                rows={5}
              />
              <div className="textarea-meta">
                <span className="privacy-note">
                  <span className="lock">⌁</span> Private & confidential
                </span>
                <span>
                  {problem.length
                    ? `${problem.length} characters`
                    : "A few sentences is enough"}
                </span>
              </div>
              <div className="example-row">
                <small>Try an example</small>
                {examples.map(([label, value]) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() => setProblem(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="category-row" aria-label="Legal category">
                {categories.map((item) => (
                  <button
                    type="button"
                    className={category === item ? "chip selected" : "chip"}
                    key={item}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <button className="primary-button" type="submit">
                Find my matches <span>→</span>
              </button>
              <p className="form-footnote">
                Free to use · No commitment · Takes about 2 minutes
              </p>
            </form>
          </section>
          <section className="trust-strip">
            <div>
              <strong>Verified</strong>
              <span>Every lawyer is credential-checked</span>
            </div>
            <div>
              <strong>Relevant</strong>
              <span>Matched to your exact situation</span>
            </div>
            <div>
              <strong>Independent</strong>
              <span>You choose who to contact</span>
            </div>
          </section>
          {submittedProblem && (
            <section className="matches-section" id="matches">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">
                    Your shortlist · {detectedPractice} law
                  </p>
                  <h2>Three lawyers fit your situation</h2>
                  <p className="match-explainer">
                    Meet identified the legal area and ranked relevant
                    experience, approach and availability.{" "}
                    {caseStatus === "saved"
                      ? "Your request has been saved securely."
                      : caseStatus === "saving"
                        ? "Saving your request…"
                        : ""}
                  </p>
                </div>
                <div className="case-summary">
                  <span>{detectedPractice}</span>
                  <p>“{submittedProblem}”</p>
                </div>
              </div>
              <div className="lawyer-grid">
                {matches.map((lawyer, index) => (
                  <article className="lawyer-card" key={lawyer.name}>
                    <div className="card-topline">
                      {lawyer.profilePhotoUrl ? (
                        <Image
                          className="avatar lawyer-photo"
                          src={lawyer.profilePhotoUrl}
                          alt={lawyer.name}
                          width={48}
                          height={48}
                          unoptimized
                        />
                      ) : (
                        <div className={`avatar ${lawyer.accent}`}>
                          {lawyer.initials}
                        </div>
                      )}
                      <span className="match-score">
                        {Math.max(86, lawyer.match - index)}% match
                      </span>
                    </div>
                    <h3>{lawyer.name}</h3>
                    <p className="specialty">{lawyer.specialty}</p>
                    <p className="location">
                      {lawyer.location} · {lawyer.languages}
                    </p>
                    <ul>
                      {lawyer.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                    <div className="card-details">
                      <span>{lawyer.price}</span>
                      <strong>{lawyer.availability}</strong>
                    </div>
                    <div className="card-actions">
                      <button
                        className="card-button"
                        onClick={() => showProfile(lawyer)}
                      >
                        View profile
                      </button>
                      <button
                        className={
                          selected === lawyer.name
                            ? "contact-card chosen"
                            : "contact-card"
                        }
                        onClick={() => openContact(lawyer)}
                      >
                        {selected === lawyer.name ? "Requested ✓" : "Contact"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <LawyerStudio
          step={lawyerStep}
          setStep={setLawyerStep}
          draft={draft}
          changeDraft={changeDraft}
          publishProfile={publishProfile}
          publishStatus={publishStatus}
        />
      )}

      {contactOpen && activeLawyer && (
        <div className="modal-backdrop">
          <div
            className="contact-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-title"
          >
            <button
              className="modal-close"
              onClick={() => setContactOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <span className="modal-icon">✓</span>
            <p className="section-kicker">Contact {activeLawyer.name}</p>
            {contactStatus === "sent" ? (
              <>
                <h2 id="contact-title">Request sent.</h2>
                <p>
                  {activeLawyer.name.split(" ")[0]} has received your enquiry.
                  You’ll hear back at {contact.email}.
                </p>
                <button
                  className="primary-button"
                  onClick={() => setContactOpen(false)}
                >
                  Done <span>→</span>
                </button>
              </>
            ) : (
              <>
                <h2 id="contact-title">Request a consultation</h2>
                <p>
                  Share your details and {activeLawyer.name.split(" ")[0]} will
                  respond within one business day.
                </p>
                <input
                  aria-label="Your name"
                  placeholder="Your name"
                  value={contact.name}
                  onChange={(e) =>
                    setContact({ ...contact, name: e.target.value })
                  }
                />
                <input
                  aria-label="Email address"
                  placeholder="Email address"
                  type="email"
                  value={contact.email}
                  onChange={(e) =>
                    setContact({ ...contact, email: e.target.value })
                  }
                />
                <textarea
                  aria-label="Message"
                  value={contact.message}
                  onChange={(e) =>
                    setContact({ ...contact, message: e.target.value })
                  }
                  rows={4}
                />
                {contactStatus === "error" && (
                  <p className="form-error">
                    Complete all fields with a valid email.
                  </p>
                )}
                <button
                  className="primary-button"
                  onClick={sendContact}
                  disabled={contactStatus === "sending"}
                >
                  {contactStatus === "sending" ? "Sending…" : "Send request"}{" "}
                  <span>→</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <footer>
        <span className="brand">
          <span className="brand-mark">M</span>
          <span>meet</span>
        </span>
        <p>Clear legal help starts with the right introduction.</p>
        <div>
          <a href="#top">Privacy</a>
          <a href="#top">How it works</a>
          <a href="#top">Contact</a>
        </div>
      </footer>
    </main>
  );
}

function PublicProfile({
  lawyer,
  onBack,
  onContact,
}: {
  lawyer: Lawyer;
  onBack: () => void;
  onContact: () => void;
}) {
  return (
    <section className="public-profile" id="top">
      <button className="back-link" onClick={onBack}>
        ← Back to matches
      </button>
      <div className="profile-main">
        <div className="public-hero">
          {lawyer.profilePhotoUrl ? (
            <Image
              className="avatar xl lawyer-photo"
              src={lawyer.profilePhotoUrl}
              alt={lawyer.name}
              width={100}
              height={100}
              unoptimized
            />
          ) : (
            <div className={`avatar ${lawyer.accent} xl`}>
              {lawyer.initials}
            </div>
          )}
          <div>
            <span className="verified">✓ Identity & credentials verified</span>
            <h1>{lawyer.name}</h1>
            <p className="profile-title">{lawyer.specialty}</p>
            <p className="location">
              {lawyer.location} · {lawyer.languages}
            </p>
          </div>
        </div>
        <div className="profile-section">
          <p className="section-kicker">About</p>
          <h2>Clear advice, built around your situation.</h2>
          <p className="long-bio">{lawyer.bio}</p>
        </div>
        <div className="profile-section">
          <p className="section-kicker">Areas of expertise</p>
          <div className="expertise-grid">
            {lawyer.tags.map((tag, i) => (
              <div key={tag}>
                <span>0{i + 1}</span>
                <strong>{tag}</strong>
                <small>{lawyer.reasons[i % lawyer.reasons.length]}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="profile-section">
          <p className="section-kicker">Latest insight</p>
          <div className="article-card">
            <small>{lawyer.practice} · 4 min read</small>
            <h3>{lawyer.post}</h3>
            <span>Read article →</span>
          </div>
        </div>
      </div>
      <aside className="profile-contact-card">
        <div className="match-score">94% match for your case</div>
        <h3>Work with {lawyer.name.split(" ")[0]}</h3>
        <div>
          <small>Consultation</small>
          <strong>{lawyer.price}</strong>
        </div>
        <div>
          <small>Next available</small>
          <strong className="green">{lawyer.availability}</strong>
        </div>
        <div>
          <small>Experience</small>
          <strong>{lawyer.experience}</strong>
        </div>
        <div>
          <small>Credentials</small>
          <strong>{lawyer.credentials}</strong>
        </div>
        <button className="primary-button" onClick={onContact}>
          Contact {lawyer.name.split(" ")[0]} <span>→</span>
        </button>
        <button className="card-button">Save profile</button>
        {lawyer.slug ? (
          <Link className="full-profile-link" href={`/lawyers/${lawyer.slug}`}>
            Open full profile page →
          </Link>
        ) : null}
        <p>No commitment. Your information stays private.</p>
      </aside>
    </section>
  );
}

function LawyerStudio({
  step,
  setStep,
  draft,
  changeDraft,
  publishProfile,
  publishStatus,
}: {
  step: string;
  setStep: (s: "intro" | "prepare" | "draft" | "published") => void;
  draft: typeof emptyDraft;
  changeDraft: (f: keyof typeof emptyDraft, v: string) => void;
  publishProfile: () => Promise<void>;
  publishStatus: "idle" | "publishing" | "error";
}) {
  if (step === "intro")
    return (
      <section className="lawyer-view">
        <div className="lawyer-intro">
          <div className="eyebrow">
            <span /> Your practice, clearly presented
          </div>
          <h1>Build a profile clients can trust.</h1>
          <p>
            Create your private lawyer workspace to build a polished profile,
            publish articles and update your practice whenever you need.
          </p>
          <Link
            className="primary-button compact account-cta"
            href="/lawyer/account"
          >
            Create lawyer account <span>→</span>
          </Link>
          <p className="small-note">Free to start · Save and edit anytime</p>
        </div>
        <div className="profile-preview">
          <div className="preview-label">Published profile preview</div>
          <div className="profile-head">
            <div className="avatar coral large">AM</div>
            <div>
              <h2>Ana Martins</h2>
              <p>Employment & workplace lawyer</p>
            </div>
            <span className="verified">✓ Verified</span>
          </div>
          <p className="bio">
            I help employees and growing teams resolve workplace issues with
            clarity, empathy and a practical plan forward.
          </p>
          <div className="profile-tags">
            <span>Dismissal</span>
            <span>Contracts</span>
            <span>Negotiation</span>
          </div>
          <div className="profile-facts">
            <div>
              <small>Experience</small>
              <strong>12 years</strong>
            </div>
            <div>
              <small>Languages</small>
              <strong>EN · FR · PT</strong>
            </div>
            <div>
              <small>Consultation</small>
              <strong>From €180</strong>
            </div>
          </div>
          <div className="post-preview">
            <small>Latest insight · 4 min read</small>
            <strong>What to do before signing a termination agreement</strong>
            <span>Read post →</span>
          </div>
        </div>
        <div className="profile-fields">
          <p>How it works</p>
          <div className="field-list">
            <span>01</span>
            <strong>Share your practice details</strong>
            <small>Expertise, clients, approach and fees</small>
            <span>02</span>
            <strong>Meet writes your first draft</strong>
            <small>Professional copy in your own voice</small>
            <span>03</span>
            <strong>Edit and preview everything</strong>
            <small>You stay in full control</small>
            <span>04</span>
            <strong>Publish when ready</strong>
            <small>Update your profile at any time</small>
          </div>
        </div>
      </section>
    );
  if (step === "published")
    return (
      <section className="publish-success">
        <span className="success-mark">✓</span>
        <p className="section-kicker">Profile published</p>
        <h1>
          You’re ready to meet
          <br />
          the right clients.
        </h1>
        <p>
          Your public profile is now visible in relevant client matches. You can
          update it whenever your practice changes.
        </p>
        <div>
          <button
            className="primary-button compact"
            onClick={() => setStep("draft")}
          >
            Edit profile <span>→</span>
          </button>
          <button className="card-button wide" onClick={() => setStep("intro")}>
            View public profile
          </button>
        </div>
      </section>
    );
  if (step === "draft")
    return (
      <section className="studio">
        <StudioHeader
          step="2 of 2"
          title="Review your AI draft"
          subtitle="Everything is editable. Refine the language until it sounds like you."
        />
        <div className="draft-layout">
          <div className="edit-panel">
            {Object.entries(draft).map(([key, value]) => (
              <label key={key}>
                <span>
                  {key === "bio"
                    ? "Professional introduction"
                    : key === "post"
                      ? "First article idea"
                      : key[0].toUpperCase() + key.slice(1)}
                </span>
                {key === "bio" || key === "approach" ? (
                  <textarea
                    rows={key === "bio" ? 4 : 2}
                    value={value}
                    onChange={(e) =>
                      changeDraft(key as keyof typeof draft, e.target.value)
                    }
                  />
                ) : (
                  <input
                    value={value}
                    onChange={(e) =>
                      changeDraft(key as keyof typeof draft, e.target.value)
                    }
                  />
                )}
              </label>
            ))}
            {publishStatus === "error" && (
              <p className="form-error">
                The profile could not be published. Please check the required
                fields and try again.
              </p>
            )}
            <div className="draft-actions">
              <button
                className="card-button"
                onClick={() => setStep("prepare")}
              >
                ← Back
              </button>
              <button
                className="primary-button compact"
                onClick={publishProfile}
                disabled={publishStatus === "publishing"}
              >
                {publishStatus === "publishing"
                  ? "Publishing…"
                  : "Publish profile"}{" "}
                <span>→</span>
              </button>
            </div>
          </div>
          <DraftPreview draft={draft} />
        </div>
      </section>
    );
  return (
    <section className="studio">
      <StudioHeader
        step="1 of 2"
        title="Tell us about your practice"
        subtitle="Add the essentials. Meet will turn them into a clear, client-friendly profile."
      />
      <div className="prepare-card">
        <div className="form-section">
          <span className="form-number">01</span>
          <div>
            <h3>Your basics</h3>
            <p>How clients and peers know you.</p>
          </div>
          <label>
            Full name
            <input
              value={draft.name}
              onChange={(e) => changeDraft("name", e.target.value)}
            />
          </label>
          <label>
            Professional title
            <input
              value={draft.title}
              onChange={(e) => changeDraft("title", e.target.value)}
            />
          </label>
          <label>
            Location & availability
            <input
              value={draft.city}
              onChange={(e) => changeDraft("city", e.target.value)}
            />
          </label>
        </div>
        <div className="form-section">
          <span className="form-number">02</span>
          <div>
            <h3>Your expertise</h3>
            <p>Be specific—this powers client matching.</p>
          </div>
          <label>
            Practice areas
            <input
              value={draft.specialties}
              onChange={(e) => changeDraft("specialties", e.target.value)}
            />
          </label>
          <label>
            Years of experience
            <input
              value={draft.experience}
              onChange={(e) => changeDraft("experience", e.target.value)}
            />
          </label>
          <label>
            Languages
            <input
              value={draft.languages}
              onChange={(e) => changeDraft("languages", e.target.value)}
            />
          </label>
        </div>
        <div className="form-section">
          <span className="form-number">03</span>
          <div>
            <h3>Your way of working</h3>
            <p>Help clients understand the human fit.</p>
          </div>
          <label>
            How would clients describe you?
            <textarea
              rows={3}
              value={draft.approach}
              onChange={(e) => changeDraft("approach", e.target.value)}
            />
          </label>
          <label>
            Typical consultation fee
            <input
              value={draft.fee}
              onChange={(e) => changeDraft("fee", e.target.value)}
            />
          </label>
        </div>
        <button className="ai-draft-button" onClick={() => setStep("draft")}>
          <span>✦</span>
          <div>
            <strong>Draft my profile with AI</strong>
            <small>
              Meet will create your introduction, structure and first post idea.
            </small>
          </div>
          <b>→</b>
        </button>
      </div>
    </section>
  );
}

function StudioHeader({
  step,
  title,
  subtitle,
}: {
  step: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="studio-head">
      <button className="back-link">← Exit setup</button>
      <span>Step {step}</span>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div className="progress">
        <i />
        <i />
      </div>
    </div>
  );
}
function DraftPreview({ draft }: { draft: typeof emptyDraft }) {
  return (
    <aside className="draft-preview">
      <div className="preview-label">Live preview</div>
      <div className="profile-head">
        <div className="avatar blue large">
          {draft.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)}
        </div>
        <div>
          <h2>{draft.name}</h2>
          <p>{draft.title}</p>
        </div>
        <span className="verified">Draft</span>
      </div>
      <p className="bio">{draft.bio}</p>
      <div className="profile-tags">
        {draft.specialties.split(",").map((t) => (
          <span key={t}>{t.trim()}</span>
        ))}
      </div>
      <div className="profile-facts">
        <div>
          <small>Experience</small>
          <strong>{draft.experience}</strong>
        </div>
        <div>
          <small>Languages</small>
          <strong>{draft.languages}</strong>
        </div>
        <div>
          <small>Consultation</small>
          <strong>{draft.fee}</strong>
        </div>
      </div>
      <div className="post-preview">
        <small>Suggested first post</small>
        <strong>{draft.post}</strong>
        <span>Preview article →</span>
      </div>
    </aside>
  );
}
