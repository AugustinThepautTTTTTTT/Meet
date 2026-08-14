"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { CaseBrief } from "@/lib/case-brief";
import type { IntakeExchange, IntakeState } from "@/lib/intake";
import { useLocale } from "@/app/components/locale-provider";

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
  firstConsultationPriceCents?: number | null;
  consultationCurrency?: string;
  firstConsultationFree?: boolean;
  availability: string;
  accent: string;
  reasons: string[];
  bio: string;
  experience: string;
  credentials: string;
  tags: string[];
  post: string;
  postSlug?: string;
  keywords: string[];
  profilePhotoUrl?: string;
  coverPhotoUrl?: string;
  tagline?: string;
};
type AiRanking = {
  slug: string;
  score: number;
  reasons: string[];
  jurisdictionNote: string;
};
type IntakeDocument = {
  id: string;
  token: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  analysis: {
    documentType: string;
    summary: string;
    analysisMode?: "quick" | "deep";
    disputeObject?: string;
    claims?: string[];
    procedure?: string;
    detailedAnalysis?: string;
    chronology?: string[];
    legalIssues?: string[];
    citedEvidence?: string[];
    uncertainties?: string[];
    relevantFacts: string[];
    dates: string[];
    parties: string[];
    questionsRaised: string[];
    extractionNotice: string;
  };
};

const preparationByPractice: Record<string, string[]> = {
  Employment: [
    "Employment agreement",
    "Dismissal or warning letter",
    "A list of important workplace dates",
  ],
  Family: [
    "Relevant agreements or court orders",
    "A list of important family dates",
    "Financial information you may discuss",
  ],
  Housing: [
    "Lease or tenancy agreement",
    "Notices from the landlord or tenant",
    "Photos and payment records",
  ],
  Business: [
    "Relevant contract or term sheet",
    "Company and counterparty names",
    "A short timeline of negotiations",
  ],
  Immigration: [
    "Passport and current permit",
    "Letters from immigration authorities",
    "Application and travel dates",
  ],
  Criminal: [
    "Court or police documents",
    "Hearing and interview dates",
    "Do not upload sensitive evidence yet",
  ],
};

function preparationItems(practice = "") {
  return (
    preparationByPractice[practice] || [
      "Relevant contracts or official letters",
      "A list of important dates",
      "Names of the people and organisations involved",
    ]
  );
}

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
    "J’ai été licencié sans préavis et mon employeur ne m’a pas versé mon dernier salaire.",
  ],
  [
    "My visa expires",
    "My work visa expires next month and I need help applying for residency.",
    "Mon titre de séjour salarié expire le mois prochain et j’ai besoin d’aide pour son renouvellement.",
  ],
  [
    "I’m getting divorced",
    "My partner and I are separating and we need to agree on custody of our children.",
    "Mon conjoint et moi nous séparons et devons organiser la résidence de nos enfants.",
  ],
  [
    "Landlord dispute",
    "My landlord is keeping my deposit and threatening eviction even though I paid rent.",
    "Mon propriétaire conserve mon dépôt de garantie et menace de m’expulser alors que mes loyers sont payés.",
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

const locationJurisdictions: Record<string, string> = {
  Paris: "France French Paris",
  Lyon: "France French Lyon",
  Marseille: "France French Marseille",
  Brussels: "Belgium Belgian Brussels",
  Berlin: "Germany German Berlin",
  Madrid: "Spain Spanish Madrid",
  London: "United Kingdom UK England English London",
  Amsterdam: "Netherlands Dutch Amsterdam",
  Stockholm: "Sweden Swedish Stockholm",
};

function jurisdictionFit(lawyer: Lawyer, jurisdiction = "") {
  if (!jurisdiction || jurisdiction === "Not confirmed") return 0;
  const requested = jurisdiction.toLowerCase();
  const coverage =
    `${lawyer.location} ${lawyer.credentials} ${locationJurisdictions[lawyer.location] || ""}`.toLowerCase();
  const terms = requested.split(/[^a-z]+/).filter((term) => term.length > 3);
  return terms.some((term) => coverage.includes(term)) ? 35 : 0;
}

export default function Home() {
  const { locale } = useLocale();
  const [clientStep, setClientStep] = useState<
    "describe" | "conversation" | "matches" | "booked"
  >("describe");
  const [caseId, setCaseId] = useState("");
  const [brief, setBrief] = useState<CaseBrief | null>(null);
  const [exchanges, setExchanges] = useState<IntakeExchange[]>([]);
  const [intake, setIntake] = useState<IntakeState | null>(null);
  const [aiActivity, setAiActivity] = useState<{
    stage: "idle" | "understanding" | "matching" | "error";
    label: string;
    generationId?: string;
    trace?: { model: string; durationMs: number; ttftMs: number | null; inputTokens?: number; outputTokens?: number };
  }>({ stage: "idle", label: "" });
  const [intakeDocuments, setIntakeDocuments] = useState<IntakeDocument[]>([]);
  const [documentStatus, setDocumentStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [documentError, setDocumentError] = useState("");
  const [aiRankings, setAiRankings] = useState<AiRanking[]>([]);
  const [aiMatchingComplete, setAiMatchingComplete] = useState(false);
  const [view, setView] = useState<"client" | "lawyer">("client");
  const category = "Not sure";
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
  const [contact, setContact] = useState({
    name: "",
    email: "",
    password: "",
    message: "",
  });
  const [bookingAuthMode, setBookingAuthMode] = useState<"signup" | "signin">(
    "signup",
  );
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedTimeStart, setSelectedTimeStart] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [availabilityDays, setAvailabilityDays] = useState<
    Array<{
      date: string;
      weekday: string;
      dayLabel: string;
      slots: Array<{ start: string; label: string }>;
    }>
  >([]);
  const [selectedAvailabilityDate, setSelectedAvailabilityDate] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityTimezone, setAvailabilityTimezone] = useState("");
  const [contactStatus, setContactStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [contactError, setContactError] = useState("");
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
    () =>
      intake?.practice && intake.practice !== "Other"
        ? (intake.practice as Practice)
        : detectPractice(submittedProblem || problem, category),
    [intake, submittedProblem, problem, category],
  );
  const matches = useMemo(() => {
    if (aiMatchingComplete) {
      return aiRankings
        .map((ranking) => {
          const lawyer = directoryLawyers.find(
            (candidate) => candidate.slug === ranking.slug,
          );
          return lawyer
            ? {
                ...lawyer,
                match: ranking.score,
                reasons: [
                  ...ranking.reasons,
                  ...(ranking.jurisdictionNote &&
                  !/confirmed|eligible|admitted/i.test(ranking.jurisdictionNote)
                    ? [ranking.jurisdictionNote]
                    : []),
                ].slice(0, 3),
              }
            : null;
        })
        .filter((lawyer): lawyer is Lawyer => Boolean(lawyer));
    }
    return [...directoryLawyers]
      .sort((a, b) => {
        const aScore =
          (a.practice === detectedPractice ? 100 : 0) +
          a.keywords.filter((k) => submittedProblem.toLowerCase().includes(k))
            .length *
            5 +
          jurisdictionFit(a, intake?.jurisdiction) +
          a.match;
        const bScore =
          (b.practice === detectedPractice ? 100 : 0) +
          b.keywords.filter((k) => submittedProblem.toLowerCase().includes(k))
            .length *
            5 +
          jurisdictionFit(b, intake?.jurisdiction) +
          b.match;
        return bScore - aScore;
      })
      .slice(0, 3);
  }, [
    submittedProblem,
    detectedPractice,
    directoryLawyers,
    intake,
    aiRankings,
    aiMatchingComplete,
  ]);

  async function findMatches(event: FormEvent) {
    event.preventDefault();
    if (!problem.trim() && intakeDocuments.length === 0) {
      setDocumentError(locale === "fr" ? "Décrivez votre situation ou ajoutez un document." : "Describe your situation or attach a document.");
      return;
    }
    const description =
      problem.trim() ||
      (intakeDocuments.length
        ? locale === "fr" ? "Je souhaite comprendre précisément le dossier exposé dans le document joint et être orienté vers l’avocat adapté." : "I need help understanding the legal issue shown in the attached document."
        : "I need help understanding a business contract.");
    setSubmittedProblem(description);
    setExchanges([]);
    setIntake(null);
    setAiRankings([]);
    setAiMatchingComplete(false);
    setClientStep("conversation");
    setCaseStatus("saving");
    void continueIntake(description, []);
    window.setTimeout(
      () =>
        document
          .getElementById("guided-conversation")
          ?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  }

  async function continueIntake(
    description: string,
    nextExchanges: IntakeExchange[],
    activeDocuments = intakeDocuments,
  ) {
    setCaseStatus("saving");
    setAiActivity({
      stage: "understanding",
      label: locale === "fr" ? "Compréhension de votre message…" : "Understanding your message…",
    });
    try {
      const response = await fetch("/api/intake/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: description,
          exchanges: nextExchanges,
          locale,
          documents: activeDocuments.map(({ id, token }) => ({ id, token })),
        }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Stream unavailable");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed: IntakeState | null = null;
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const message = JSON.parse(line);
          if (message.type === "trace")
            setAiActivity({ stage: "understanding", label: message.label, generationId: message.generationId });
          if (message.type === "text-delta")
            setIntake((current) => ({ ...(current || {}), assistantMessage: message.text } as IntakeState));
          if (message.type === "partial" && message.intake)
            setIntake((current) => ({ ...(current || {}), ...message.intake } as IntakeState));
          if (message.type === "complete") {
            completed = message.intake;
            setIntake(message.intake);
            setAiActivity({
              stage: "idle",
              label: locale === "fr" ? "Réponse générée" : "Reply generated",
              generationId: message.generationId,
              trace: message.trace,
            });
          }
          if (message.type === "error") throw new Error(message.message);
        }
        if (done) break;
      }
      if (!completed) throw new Error("Incomplete generation");
      if (completed.ready)
        await finishConversation(completed, nextExchanges, activeDocuments);
      else setCaseStatus("idle");
    } catch {
      setCaseStatus("error");
      setAiActivity({ stage: "error", label: locale === "fr" ? "La génération a échoué — réessayez." : "Generation failed — please retry." });
    }
  }

  async function finishConversation(
    finalIntake: IntakeState,
    completedExchanges: IntakeExchange[],
    activeDocuments = intakeDocuments,
  ) {
    const description = submittedProblem || problem.trim();
    setCaseStatus("saving");
    setAiActivity({ stage: "matching", label: locale === "fr" ? "Comparaison avec les profils d’avocats…" : "Comparing lawyer profiles…" });
    try {
      const completedBrief: CaseBrief = {
        summary: finalIntake.summary || description,
        dispute: finalIntake.dispute,
        keyFacts: finalIntake.keyFacts,
        conversation: [
          { role: "client", content: description },
          ...completedExchanges.flatMap((exchange) => [
            { role: "assistant" as const, content: exchange.question },
            { role: "client" as const, content: exchange.answer },
          ]),
        ],
        practice: finalIntake.practice,
        legalDomain: finalIntake.legalDomain,
        courtOrProcedure: finalIntake.courtOrProcedure,
        territorialBar: finalIntake.territorialBar,
        applicableLaw: finalIntake.applicableLaw,
        jurisdiction:
          finalIntake.jurisdiction ||
          finalIntake.incidentLocation ||
          "Not confirmed",
        urgency: finalIntake.urgency,
        deadline: finalIntake.deadline || "No deadline confirmed",
        desiredOutcome:
          finalIntake.desiredOutcome || "Understand options and next steps",
        parties: finalIntake.parties || "Not provided",
        language: finalIntake.language || "English",
        meetingFormat: finalIntake.meetingFormat || "Video call",
        timeline: [
          "Client described the situation through Meet",
          `Intake completed in ${completedExchanges.length + 1} AI checks`,
        ],
        missingInformation: finalIntake.missingInformation,
        documents: activeDocuments.map((document) => ({
          id: document.id,
          filename: document.filename,
          documentType: document.analysis.documentType,
          summary: document.analysis.summary,
          relevantFacts: document.analysis.relevantFacts,
          dates: document.analysis.dates,
          parties: document.analysis.parties,
          detailedAnalysis: document.analysis.detailedAnalysis,
          chronology: document.analysis.chronology,
          legalIssues: document.analysis.legalIssues,
          claims: document.analysis.claims,
          procedure: document.analysis.procedure,
          uncertainties: document.analysis.uncertainties,
        })),
      };
      const [response, matchResponse] = await Promise.all([
        fetch("/api/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problem: description,
            category,
            detectedPractice: finalIntake.practice,
            brief: completedBrief,
            documentRefs: activeDocuments.map(({ id, token }) => ({ id, token })),
          }),
        }),
        fetch("/api/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brief: completedBrief, locale }),
        }),
      ]);
      const data = await response.json();
      if (!response.ok) throw new Error();
      if (matchResponse.ok) {
        const matchData = await matchResponse.json();
        setAiRankings(matchData.rankings || []);
        setAiMatchingComplete(true);
      }
      setCaseId(data.case.id);
      setBrief(completedBrief);
      setClientStep("matches");
      setCaseStatus("saved");
      setAiActivity((current) => ({ ...current, stage: "idle", label: locale === "fr" ? "Sélection prête" : "Shortlist ready" }));
      window.setTimeout(
        () =>
          document
            .getElementById("matches")
            ?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    } catch {
      setCaseStatus("error");
      setAiActivity({ stage: "error", label: locale === "fr" ? "La sélection n’a pas pu être préparée." : "The shortlist could not be prepared." });
    }
  }

  function answerChatQuestion(answer: string) {
    const clean = answer.trim();
    if (!clean || !intake?.nextQuestion) return;
    const nextExchanges = [
      ...exchanges,
      { question: intake.assistantMessage || intake.nextQuestion, answer: clean },
    ];
    setExchanges(nextExchanges);
    void continueIntake(submittedProblem, nextExchanges);
  }
  async function uploadIntakeDocument(file: File) {
    if (intakeDocuments.length >= 3) {
      setDocumentError("You can attach up to three focused documents.");
      setDocumentStatus("error");
      return;
    }
    setDocumentStatus("uploading");
    setDocumentError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("locale", locale);
      form.set("analysisMode", "deep");
      const response = await fetch("/api/intake/documents", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Document could not be read.");
      const nextDocuments = [...intakeDocuments, result.document];
      setIntakeDocuments(nextDocuments);
      setDocumentStatus("idle");
      if (clientStep === "conversation" && submittedProblem)
        await continueIntake(submittedProblem, exchanges, nextDocuments);
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Document could not be read.");
      setDocumentStatus("error");
    }
  }
  async function removeIntakeDocument(document: IntakeDocument) {
    const nextDocuments = intakeDocuments.filter((item) => item.id !== document.id);
    setIntakeDocuments(nextDocuments);
    setDocumentError("");
    await fetch("/api/intake/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: document.id, token: document.token }),
    });
    if (clientStep === "conversation")
      await continueIntake(submittedProblem, exchanges, nextDocuments);
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
    setContactError("");
    setSelectedTime(lawyer.availability);
    setSelectedTimeStart("");
    setAvailableTimes([lawyer.availability]);
    setAvailabilityDays([]);
    setSelectedAvailabilityDate("");
    setAvailabilityLoading(true);
    setAvailabilityTimezone("");
    setContactOpen(true);
    if (lawyer.slug) {
      fetch(`/api/lawyers/${lawyer.slug}/availability`)
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((data) => {
          setAvailabilityDays(data.days || []);
          const firstDay = data.days?.find(
            (day: { slots?: unknown[] }) => day.slots?.length,
          );
          if (firstDay) {
            setSelectedAvailabilityDate(firstDay.date);
            setSelectedTime(
              `${firstDay.weekday}, ${firstDay.dayLabel} · ${firstDay.slots[0].label}`,
            );
            setSelectedTimeStart(firstDay.slots[0].start);
          } else if (data.slots?.length) {
            setAvailableTimes(data.slots);
            setSelectedTime(data.slots[0]);
          }
          setAvailabilityTimezone(data.timezone || "");
        })
        .catch(() => undefined)
        .finally(() => setAvailabilityLoading(false));
    }
  }
  function closeContact() {
    setContactOpen(false);
    setActiveLawyer(null);
  }
  async function sendContact() {
    if (!activeLawyer || !caseId || !activeLawyer.slug) return;
    setContactStatus("sending");
    setContactError("");
    try {
      const response = await fetch(`/api/cases/${caseId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawyerSlug: activeLawyer.slug,
          clientName: contact.name,
          clientEmail: contact.email,
          clientPassword: contact.password,
          bookingAuthMode,
          meetingTime: selectedTime,
          meetingStart: selectedTimeStart,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }
      setSelected(activeLawyer.name);
      setContactStatus("sent");
      setClientStep("booked");
    } catch (error) {
      setContactError(
        error instanceof Error ? error.message : "Complete all account fields.",
      );
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
            setClientStep("describe");
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
        <div className="account-links">
          <Link href="/client/account">Client sign in</Link>
          <Link className="account-button" href="/lawyer/account">
            Lawyer sign in
          </Link>
        </div>
      </header>

      {view === "client" && activeLawyer && !contactOpen ? (
        <PublicProfile
          lawyer={activeLawyer}
          onBack={() => setActiveLawyer(null)}
          onContact={() => openContact(activeLawyer)}
        />
      ) : view === "client" ? (
        <>
          <section className="hero" id="top">
            <div className="hero-intro">
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
              <div className="hero-confidence" aria-label="How Meet works">
                <span><b>1</b> Explain your situation</span>
                <span><b>2</b> Review your matches</span>
                <span><b>3</b> Book securely</span>
              </div>
              <p className="hero-disclaimer">
                Meet helps you find independent lawyers. It does not provide legal advice.
              </p>
            </div>
            <div className="hero-workspace">
              {clientStep === "describe" ? (
              <form className="intake-card" onSubmit={findMatches}>
                  <label htmlFor="problem">{locale === "fr" ? "Pour quelle situation avez-vous besoin d’aide ?" : "What do you need help with?"}</label>
                  <textarea
                    id="problem"
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    placeholder={locale === "fr" ? "Par exemple : j’ai été licencié et je ne sais pas si la procédure a été respectée…" : "For example: I’ve been dismissed from my job and I’m not sure the process was fair..."}
                    rows={5}
                  />
                  <div className="textarea-meta">
                    <span className="privacy-note"><span className="lock">⌁</span> {locale === "fr" ? "Privé et confidentiel" : "Private & confidential"}</span>
                    <span>{problem.length ? `${problem.length} ${locale === "fr" ? "caractères" : "characters"}` : locale === "fr" ? "Quelques phrases suffisent" : "A few sentences is enough"}</span>
                  </div>
                <div className="intake-document-upload">
                  <div className="intake-document-upload-heading">
                    <div>
                      <strong>{locale === "fr" ? "Vous avez un document utile ?" : "Have a relevant document?"}</strong>
                      <span>{locale === "fr" ? "Ajoutez-le : Gemini lira le document complet et l’intégrera à la conversation." : "Attach it: Gemini will read the complete document and use it in the conversation."}</span>
                    </div>
                    <label className={documentStatus === "uploading" || intakeDocuments.length >= 3 ? "disabled" : ""}>
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                        disabled={documentStatus === "uploading" || intakeDocuments.length >= 3}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadIntakeDocument(file);
                          event.target.value = "";
                        }}
                      />
                      <span>＋</span>{documentStatus === "uploading" ? (locale === "fr" ? "Analyse en cours…" : "Reading document…") : (locale === "fr" ? "Joindre un document" : "Attach a document")}
                    </label>
                  </div>
                  {intakeDocuments.length ? (
                    <div className="intake-document-list">
                      {intakeDocuments.map((document) => (
                        <article key={document.id}>
                          <span>{document.filename.split(".").pop()?.toUpperCase()}</span>
                          <div><strong>{document.filename}</strong><small>{document.analysis.analysisMode === "deep" && locale === "fr" ? "Étude approfondie terminée — prête pour la conversation" : document.analysis.summary}</small></div>
                          <button type="button" onClick={() => void removeIntakeDocument(document)} aria-label={`Remove ${document.filename}`}>×</button>
                        </article>
                      ))}
                    </div>
                  ) : null}
                  {documentError ? <p role="alert">{documentError}</p> : null}
                  <small>{locale === "fr" ? "Facultatif · Jusqu’à 3 fichiers PDF, DOCX ou TXT · 8 Mo chacun · En mode Gemini gratuit, utilisez uniquement des documents de test ou anonymisés" : "Optional · Up to 3 PDF, DOCX or TXT files · 8 MB each · With the free Gemini tier, only use test or anonymised documents"}</small>
                </div>
                <div className="example-row">
                  <small>{locale === "fr" ? "Essayer un exemple" : "Try an example"}</small>
                  {examples.map(([label, value, frenchValue]) => (
                    <button
                      type="button"
                      key={label}
                      onClick={() => setProblem(locale === "fr" ? frenchValue : value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button className="primary-button" type="submit" disabled={documentStatus === "uploading"}>
                  {documentStatus === "uploading" ? (locale === "fr" ? "Analyse du document en cours…" : "Analysing your document…") : (locale === "fr" ? "Démarrer la conversation" : "Start conversation")} <span>→</span>
                </button>
                <p className="form-footnote">
                  {locale === "fr" ? "Gratuit · Sans engagement · Document facultatif" : "Free to use · No commitment · Document optional"}
                </p>
              </form>
              ) : (
              <div className="client-progress">
                <span className="done">1</span>
                <i />
                <span
                  className={clientStep === "conversation" ? "active" : "done"}
                >
                  2
                </span>
                <i />
                <span
                  className={
                    clientStep === "matches" || clientStep === "booked"
                      ? "active"
                      : ""
                  }
                >
                  3
                </span>
                <small>
                  {clientStep === "conversation"
                    ? "Meet is understanding your situation"
                    : clientStep === "matches"
                      ? "Choose your lawyer"
                      : "Meeting requested"}
                </small>
              </div>
              )}
            </div>
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
          {clientStep === "conversation" ? (
            <ChatIntake
              problem={submittedProblem}
              practice={detectedPractice}
              intake={intake}
              exchanges={exchanges}
              documents={intakeDocuments}
              documentStatus={documentStatus}
              documentError={documentError}
              aiActivity={aiActivity}
              onAnswer={answerChatQuestion}
              onUpload={uploadIntakeDocument}
              onRemoveDocument={removeIntakeDocument}
              onRestart={() => setClientStep("describe")}
              finishing={aiActivity.stage === "matching"}
              error={caseStatus === "error"}
            />
          ) : null}
          {(clientStep === "matches" || clientStep === "booked") &&
            submittedProblem && (
              <>
                <section className="matches-section" id="matches">
                  <div className="section-heading">
                    <div>
                      <p className="section-kicker">
                        {locale === "fr" ? "Votre sélection" : "Your shortlist"} · {locale === "fr" ? ({ Employment: "droit du travail", Family: "droit de la famille", Housing: "droit immobilier", Business: "droit des affaires", Immigration: "droit des étrangers", Criminal: "droit pénal", Injury: "préjudice corporel", Estates: "successions", Technology: "numérique et données" } as Record<string, string>)[detectedPractice] : `${detectedPractice} law`}
                      </p>
                      <h2>
                        {matches.length === 0
                          ? "No sufficiently qualified match yet"
                          : matches.length === 1
                            ? "One lawyer strongly fits your situation"
                            : `${matches.length} lawyers fit your situation`}
                      </h2>
                      <p className="match-explainer">
                        {locale === "fr"
                          ? "Meet a comparé votre synthèse aux profils publiés en tenant compte de l’expertise, de la juridiction, de la langue et des disponibilités. "
                          : "Meet compared your brief with published lawyer profiles, including expertise, jurisdiction, language and availability. "}
                        {caseStatus === "saved"
                          ? locale === "fr" ? "Votre demande a été enregistrée de manière sécurisée." : "Your request has been saved securely."
                          : caseStatus === "saving"
                            ? locale === "fr" ? "Enregistrement de votre demande…" : "Saving your request…"
                            : ""}
                      </p>
                    </div>
                  </div>
                  <div className="results-content">
                  <div className="lawyer-grid">
                    {matches.map((lawyer, index) => (
                      <article className="lawyer-card" key={lawyer.name}>
                        <div className="card-topline">
                          {lawyer.profilePhotoUrl ? (
                            <Image className="avatar lawyer-photo" src={lawyer.profilePhotoUrl} alt={lawyer.name} width={48} height={48} unoptimized />
                          ) : <div className={`avatar ${lawyer.accent}`}>{lawyer.initials}</div>}
                          <span className="match-score">{aiMatchingComplete ? lawyer.match : Math.max(86, lawyer.match - index)}% match</span>
                        </div>
                        <h3>{lawyer.name}</h3>
                        <p className="specialty">{lawyer.specialty}</p>
                        <p className="location">{lawyer.location} · {lawyer.languages}</p>
                        <ul>{lawyer.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                        <div className="card-details"><span>{lawyer.price}</span><strong>{lawyer.availability}</strong></div>
                        <div className="card-actions">
                          <button className="card-button" onClick={() => showProfile(lawyer)}>View profile</button>
                          <button className={selected === lawyer.name ? "contact-card chosen" : "contact-card"} onClick={() => openContact(lawyer)}>{selected === lawyer.name ? "Meeting requested ✓" : "Choose a time"}</button>
                        </div>
                      </article>
                    ))}
                  </div>
                    <aside className="live-case-summary result-case-summary">
                      <header>
                        <span>Your case summary</span>
                        <i className="active" />
                      </header>
                      <h2>{brief?.dispute || "Your legal matter"}</h2>
                      <p className="live-summary-copy">{brief?.summary || submittedProblem}</p>
                      {brief?.keyFacts?.length ? (
                        <section>
                          <h3>What we understand</h3>
                          <ul>{brief.keyFacts.slice(0, 5).map((fact) => <li key={fact}>{fact}</li>)}</ul>
                        </section>
                      ) : null}
                      <div className="live-summary-meta">
                        <div><small>Legal area</small><strong>{brief?.legalDomain || brief?.practice || detectedPractice}</strong></div>
                        <div><small>Jurisdiction</small><strong>{brief?.jurisdiction || "Not confirmed"}</strong></div>
                        <div><small>Timing</small><strong>{brief?.deadline || brief?.urgency || "Being assessed"}</strong></div>
                        <div><small>Desired outcome</small><strong>{brief?.desiredOutcome || "Understand options and next steps"}</strong></div>
                        {brief?.courtOrProcedure ? <div><small>Jurisdiction or procedure</small><strong>{brief.courtOrProcedure}</strong></div> : null}
                        {brief?.territorialBar ? <div><small>Relevant bar</small><strong>{brief.territorialBar}</strong></div> : null}
                      </div>
                      {brief?.missingInformation?.length ? (
                        <section className="open-points">
                          <h3>Still useful to clarify</h3>
                          <ul>{brief.missingInformation.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>
                        </section>
                      ) : null}
                      <footer>This brief will be shared only with the lawyer you contact.</footer>
                    </aside>
                  </div>
                </section>
              </>
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
              onClick={closeContact}
              aria-label="Close"
            >
              ×
            </button>
            <span className="modal-icon">✓</span>
            <p className="section-kicker">Contact {activeLawyer.name}</p>
            {contactStatus === "sent" ? (
              <>
                <h2 id="contact-title">Your meeting is requested.</h2>
                <p>
                  {activeLawyer.name.split(" ")[0]} received your structured
                  brief and proposed time: <strong>{selectedTime}</strong>.
                  We’ll send the confirmation to {contact.email}.
                </p>
                <div className="booking-next-steps">
                  <span>✓ Case brief delivered</span>
                  <span>✓ Time held pending lawyer acceptance</span>
                  <strong>Prepare while we confirm</strong>
                  {preparationItems(brief?.practice).map((item) => (
                    <span key={item}>○ {item}</span>
                  ))}
                </div>
                <button className="primary-button" onClick={closeContact}>
                  Done <span>→</span>
                </button>
              </>
            ) : (
              <>
                <h2 id="contact-title">Choose your consultation</h2>
                <p>
                  Meet will send {activeLawyer.name.split(" ")[0]} your case
                  brief. Your details stay private until you request the
                  meeting.
                </p>
                <div className="booking-brief-mini">
                  <span>{brief?.practice}</span>
                  <p>{brief?.summary}</p>
                </div>
                <div className="booking-price-summary">
                  <span>First consultation</span>
                  <strong>{activeLawyer.price}</strong>
                  <small>
                    {activeLawyer.firstConsultationFree
                      ? "No payment is required for this consultation."
                      : "Secure test payment through Stripe. No real money is charged in sandbox mode."}
                  </small>
                </div>
                <div className="booking-calendar-heading">
                  <p className="booking-label">Preferred time</p>
                </div>
                {availabilityLoading ? (
                  <div className="availability-loading">
                    Checking the lawyer’s live calendar…
                  </div>
                ) : availabilityDays.some((day) => day.slots.length) ? (
                  <div className="day-dropdown-picker">
                    <label>
                      Choose a day
                      <select
                        value={selectedAvailabilityDate}
                        onChange={(event) => {
                          const date = event.target.value;
                          setSelectedAvailabilityDate(date);
                          const day = availabilityDays.find(
                            (item) => item.date === date,
                          );
                          if (day?.slots[0]) {
                            setSelectedTime(
                              `${day.weekday}, ${day.dayLabel} · ${day.slots[0].label}`,
                            );
                            setSelectedTimeStart(day.slots[0].start);
                          }
                        }}
                      >
                        {availabilityDays
                          .filter((day) => day.slots.length)
                          .map((day) => (
                            <option key={day.date} value={day.date}>
                              {day.weekday} · {day.dayLabel}
                            </option>
                          ))}
                      </select>
                    </label>
                    <div className="selected-day-times">
                      {availabilityDays
                        .find((day) => day.date === selectedAvailabilityDate)
                        ?.slots.map((slot) => {
                          const day = availabilityDays.find(
                            (item) => item.date === selectedAvailabilityDate,
                          )!;
                          const value = `${day.weekday}, ${day.dayLabel} · ${slot.label}`;
                          return (
                            <button
                              key={slot.start}
                              className={
                                selectedTime === value ? "selected" : ""
                              }
                              onClick={() => {
                                setSelectedTime(value);
                                setSelectedTimeStart(slot.start);
                              }}
                            >
                              {slot.label}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="meeting-times">
                    {availableTimes.map((time) => (
                      <button
                        key={time}
                        className={selectedTime === time ? "selected" : ""}
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                )}
                {availabilityTimezone ? (
                  <small className="availability-timezone">
                    Times shown in {availabilityTimezone}
                  </small>
                ) : null}
                <div className="booking-auth-toggle">
                  <button
                    className={bookingAuthMode === "signup" ? "active" : ""}
                    onClick={() => setBookingAuthMode("signup")}
                  >
                    Create account
                  </button>
                  <button
                    className={bookingAuthMode === "signin" ? "active" : ""}
                    onClick={() => setBookingAuthMode("signin")}
                  >
                    I already have an account
                  </button>
                </div>
                {bookingAuthMode === "signup" ? (
                  <input
                    aria-label="Your name"
                    placeholder="Your name"
                    value={contact.name}
                    onChange={(e) =>
                      setContact({ ...contact, name: e.target.value })
                    }
                  />
                ) : null}
                <input
                  aria-label="Email address"
                  placeholder="Email address"
                  type="email"
                  value={contact.email}
                  onChange={(e) =>
                    setContact({ ...contact, email: e.target.value })
                  }
                />
                <div className="account-at-booking">
                  <strong>
                    {bookingAuthMode === "signup"
                      ? "Your private client account"
                      : "Sign in to your client account"}
                  </strong>
                  <span>
                    {bookingAuthMode === "signup"
                      ? "Created only when you send this request, so you can follow the meeting and brief."
                      : "This new request will be added to your existing account."}
                  </span>
                </div>
                <input
                  aria-label={
                    bookingAuthMode === "signup"
                      ? "Create a password"
                      : "Password"
                  }
                  placeholder={
                    bookingAuthMode === "signup"
                      ? "Create a password · 8 characters minimum"
                      : "Your password"
                  }
                  type="password"
                  autoComplete="new-password"
                  value={contact.password}
                  onChange={(e) =>
                    setContact({ ...contact, password: e.target.value })
                  }
                />
                {contactStatus === "error" && (
                  <p className="form-error">
                    {contactError ||
                      "Complete all fields with a valid email and password."}
                  </p>
                )}
                <button
                  className="primary-button"
                  onClick={sendContact}
                  disabled={contactStatus === "sending"}
                >
                  {contactStatus === "sending"
                    ? activeLawyer.firstConsultationFree
                      ? "Requesting meeting…"
                      : "Opening secure payment…"
                    : activeLawyer.firstConsultationFree
                      ? "Request this meeting"
                      : "Continue to secure payment"}{" "}
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

function ChatIntake({
  problem,
  practice,
  intake,
  exchanges,
  documents,
  documentStatus,
  documentError,
  aiActivity,
  onAnswer,
  onUpload,
  onRemoveDocument,
  onRestart,
  finishing,
  error,
}: {
  problem: string;
  practice: Practice;
  intake: IntakeState | null;
  exchanges: IntakeExchange[];
  documents: IntakeDocument[];
  documentStatus: "idle" | "uploading" | "error";
  documentError: string;
  aiActivity: {
    stage: "idle" | "understanding" | "matching" | "error";
    label: string;
    generationId?: string;
    trace?: { model: string; durationMs: number; ttftMs: number | null; inputTokens?: number; outputTokens?: number };
  };
  onAnswer: (answer: string) => void;
  onUpload: (file: File) => void;
  onRemoveDocument: (document: IntakeDocument) => void;
  onRestart: () => void;
  finishing: boolean;
  error: boolean;
}) {
  const { locale } = useLocale();
  const [answer, setAnswer] = useState("");
  const [traceSeconds, setTraceSeconds] = useState(0);
  useEffect(() => {
    if (aiActivity.stage !== "understanding") return;
    const started = Date.now();
    const timer = window.setInterval(() => setTraceSeconds(Math.floor((Date.now() - started) / 1000)), 250);
    return () => window.clearInterval(timer);
  }, [aiActivity.generationId, aiActivity.stage]);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!answer.trim()) return;
    onAnswer(answer);
    setAnswer("");
  }
  return (
    <section className="guided-chat-section" id="guided-conversation">
      <div className="chat-workspace">
      <div className="chat-shell">
        <header>
          <div className="meet-chat-avatar">M</div>
          <div>
            <strong>{locale === "fr" ? "Assistant Meet" : "Meet assistant"}</strong>
            <span>
              <i /> {locale === "fr" ? "Compréhension de votre situation" : `Understanding your ${practice.toLowerCase()} matter`}
            </span>
          </div>
          <small>{locale === "fr" ? "Conversation privée tenant compte de vos documents" : "Private, document-aware conversation"}</small>
        </header>
        <div className="chat-transcript" aria-live="polite">
          <div className="chat-row user">
            <p>{problem}</p>
          </div>
          {documents.length ? (
            <div className="chat-documents initial-documents">
              {documents.map((document) => (
                <article key={document.id}>
                  <div><span>{document.filename.split(".").pop()?.toUpperCase()}</span><strong>{document.filename}</strong></div>
                  <p>{document.analysis.summary}</p>
                  {document.analysis.detailedAnalysis ? <details className="document-deep-study">
                    <summary>Voir l’étude détaillée du document</summary>
                    <div>
                      <p>{document.analysis.detailedAnalysis}</p>
                      {document.analysis.chronology?.length ? <section><strong>Chronologie</strong><ul>{document.analysis.chronology.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
                      {document.analysis.legalIssues?.length ? <section><strong>Questions juridiques apparentes</strong><ul>{document.analysis.legalIssues.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
                      {document.analysis.uncertainties?.length ? <section><strong>Points réellement non établis</strong><ul>{document.analysis.uncertainties.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
                    </div>
                  </details> : null}
                  <button type="button" onClick={() => onRemoveDocument(document)} aria-label={`Remove ${document.filename}`}>Remove</button>
                </article>
              ))}
            </div>
          ) : null}
          {exchanges.map((exchange, index) => (
            <div
              className="chat-exchange"
              key={`${exchange.question}-${index}`}
            >
              <div className="chat-row meet">
                <span>M</span>
                <p>{exchange.question}</p>
              </div>
              <div className="chat-row user">
                <p>{exchange.answer}</p>
              </div>
            </div>
          ))}
          <div className="chat-row meet current">
            <span>M</span>
            <div>
              <p className="chat-assistant-message">
                {finishing
                  ? locale === "fr" ? "Votre dossier est suffisamment clair. Je compare maintenant les profils publiés pour identifier les avocats les plus pertinents." : "Your matter is clear enough. I’m now comparing published profiles to identify the most relevant lawyers."
                  : intake?.assistantMessage ||
                    (locale === "fr" ? "Je lis votre message et j’organise les éléments utiles pour vous orienter correctement…" : "I’m reading your message and organising what matters for the right introduction…")}
              </p>
              {aiActivity.stage === "understanding" ? (
                <div className="ai-generation-trace" role="status">
                  <span className="streaming-dot" />
                  <span>{aiActivity.label}</span>
                  <small>Gemini 3.5 Flash-Lite · {traceSeconds}s · streaming</small>
                </div>
              ) : aiActivity.trace ? (
                <details className="ai-generation-trace complete">
                  <summary>{locale === "fr" ? "Détails de génération" : "Generation details"}</summary>
                  <span>{aiActivity.trace.model} · {(aiActivity.trace.durationMs / 1000).toFixed(1)} s{aiActivity.trace.ttftMs ? ` · 1er texte ${(aiActivity.trace.ttftMs / 1000).toFixed(1)} s` : ""}</span>
                </details>
              ) : null}
            </div>
          </div>
        </div>
        {!finishing ? (
          <div className="chat-composer">
            <div className="chat-attachment-row">
              <label className={documentStatus === "uploading" || documents.length >= 3 ? "disabled" : ""}>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  disabled={documentStatus === "uploading" || documents.length >= 3}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onUpload(file);
                    event.target.value = "";
                  }}
                />
                <span>＋</span> {documentStatus === "uploading" ? (locale === "fr" ? "Analyse approfondie…" : "Reading document…") : (locale === "fr" ? "Ajouter un document" : "Add a document")}
              </label>
              <small>{documents.length}/3 · PDF, DOCX or TXT · 8 MB max</small>
            </div>
            {documentError ? <p className="chat-document-error" role="alert">{documentError}</p> : null}
            {intake?.options?.length ? (
              <div className="chat-options">
                {intake.options.map((option) => (
                  <button key={option} onClick={() => onAnswer(option)}>
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <form onSubmit={submit}>
                <input
                  aria-label="Your answer"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder={locale === "fr" ? "Écrivez votre réponse…" : "Type your answer…"}
                  disabled={aiActivity.stage === "understanding"}
                />
                <button type="submit" aria-label="Send answer" disabled={aiActivity.stage === "understanding"}>
                  ↑
                </button>
              </form>
            )}
            <p className="chat-ai-file-note">{locale === "fr" ? "Meet extrait les faits utiles avec l’IA. L’original reste privé et n’est transmis qu’à l’avocat contacté." : "Meet extracts relevant facts with AI. The original stays private and is shared only with the lawyer you contact."}</p>
            <button className="chat-restart" onClick={onRestart}>
              ← {locale === "fr" ? "Modifier mon premier message" : "Change my first message"}
            </button>
          </div>
        ) : (
          <div className="chat-thinking">
            <i />
            <i />
            <i />
            <span>{locale === "fr" ? "Comparaison avec les profils d’avocats…" : "Preparing your brief and shortlist…"}</span>
          </div>
        )}
        {error ? (
          <div className="chat-error">
            {locale === "fr" ? "Meet n’a pas pu terminer cette étape. Vos réponses sont conservées : vous pouvez réessayer." : "Meet couldn’t complete this step. Your answers are still here, so you can retry."}
          </div>
        ) : null}
      </div>
      <aside className="live-case-summary" aria-live="polite">
        <header>
          <span>{locale === "fr" ? "Synthèse en direct" : "Live case summary"}</span>
          <i className={intake ? "active" : ""} />
        </header>
        <h2>{intake?.dispute || (locale === "fr" ? "Compréhension de votre situation" : "Understanding your situation")}</h2>
        <p className="live-summary-copy">
          {intake?.summary || (locale === "fr" ? "Au fil de l’échange, Meet organise ici les faits importants sans interrompre la conversation." : "As you talk, Meet will organise the important facts here without interrupting the conversation.")}
        </p>
        {intake?.keyFacts?.length ? (
          <section>
            <h3>{locale === "fr" ? "Ce que nous avons compris" : "What we understand"}</h3>
            <ul>{intake.keyFacts.slice(0, 5).map((fact) => <li key={fact}>{fact}</li>)}</ul>
          </section>
        ) : null}
        <div className="live-summary-meta">
          <div><small>{locale === "fr" ? "Domaine juridique" : "Legal area"}</small><strong>{intake?.legalDomain || (intake?.practice === "Other" ? (locale === "fr" ? "En cours d’identification" : "Being identified") : intake?.practice) || (locale === "fr" ? "En cours d’identification" : "Being identified")}</strong></div>
          <div><small>Juridiction</small><strong>{intake?.jurisdiction && intake.jurisdiction !== "Not confirmed" ? intake.jurisdiction : (locale === "fr" ? "À préciser" : "Not clear yet")}</strong></div>
          <div><small>{locale === "fr" ? "Échéance" : "Timing"}</small><strong>{intake?.deadline && !/no deadline/i.test(intake.deadline) ? intake.deadline : (locale === "fr" ? "En cours d’évaluation" : "Being assessed")}</strong></div>
          <div><small>{locale === "fr" ? "Objectif" : "Desired outcome"}</small><strong>{intake?.desiredOutcome || (locale === "fr" ? "À préciser" : "Not clear yet")}</strong></div>
          {intake?.courtOrProcedure && !/à déterminer|not confirmed/i.test(intake.courtOrProcedure) ? <div><small>Jurisdiction or procedure</small><strong>{intake.courtOrProcedure}</strong></div> : null}
          {intake?.territorialBar && !/à confirmer|not confirmed/i.test(intake.territorialBar) ? <div><small>Relevant bar</small><strong>{intake.territorialBar}</strong></div> : null}
        </div>
        {intake?.missingInformation?.length ? (
          <section className="open-points">
            <h3>{locale === "fr" ? "Encore utile à préciser" : "Still useful to clarify"}</h3>
            <ul>{intake.missingInformation.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        ) : null}
        <footer>{locale === "fr" ? "Cette synthèse sert à la mise en relation ; elle ne constitue pas un conseil juridique." : "This summary is prepared for matching, not legal advice."}</footer>
      </aside>
      </div>
    </section>
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
            {lawyer.postSlug ? (
              <Link href={`/articles/${lawyer.postSlug}`}>Read article →</Link>
            ) : (
              <span>Read article →</span>
            )}
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
