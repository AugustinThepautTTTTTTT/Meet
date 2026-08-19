import { z } from "zod";

export const practiceSchema = z.enum([
  "Employment",
  "Family",
  "Housing",
  "Business",
  "Immigration",
  "Criminal",
  "Injury",
  "Estates",
  "Technology",
  "Other",
]);

export const intakeStateSchema = z.object({
  practice: practiceSchema,
  legalDomain: z.string().describe("Precise substantive field of law"),
  courtOrProcedure: z.string().describe("Likely court, judicial order, or procedural stage"),
  territorialBar: z.string().describe("Potentially relevant bar for representation/postulation, with uncertainty"),
  applicableLaw: z.string().describe("Likely national law or legal regime, with uncertainty"),
  dispute: z.string(),
  summary: z.string(),
  keyFacts: z.array(z.string()).max(6),
  jurisdiction: z.string().describe("Geographic jurisdiction: country plus city, department, or court territory; never only Judicial or Administrative"),
  incidentLocation: z.string(),
  urgency: z.enum(["Standard", "Time-sensitive", "Urgent"]),
  deadline: z.string(),
  desiredOutcome: z.string(),
  parties: z.string(),
  language: z.string(),
  meetingFormat: z.string(),
  missingInformation: z.array(z.string()).max(4),
  ready: z.boolean(),
  assistantMessage: z.string(),
  acknowledgement: z.string(),
  nextQuestion: z.string(),
  options: z.array(z.string()).max(5),
});

export type IntakeState = z.infer<typeof intakeStateSchema>;

export type IntakeExchange = { question: string; answer: string };

// A safety ceiling, not a conversational target. The model should stop as soon as
// it understands the matter well enough to match it.
export const MAX_INTAKE_TURNS = 8;

const NON_ANSWERS = /^(?:you tell me|tell me|you should tell me|i don'?t know|not sure|no idea|unknown|n\/?a|à vous de me le dire|dites[- ]le moi|je ne sais pas|aucune idée|c['’]est (?:déjà )?(?:écrit|indiqué|précisé|mentionné) dans (?:le|l['’])(?:document|assignation)|(?:regardez|lisez) (?:le|l['’])(?:document|assignation))$/i;

export function isMeaningfulIntakeAnswer(answer: string) {
  const value = answer.trim().replace(/[.!?]+$/, "");
  return value.length > 1 && !NON_ANSWERS.test(value);
}

type DocumentDate = { raw: string; date: Date };

export function documentDates(facts: string[], now = new Date()): {
  past: DocumentDate[];
  future: DocumentDate[];
} {
  const found = new Map<string, Date>();
  for (const fact of facts) {
    for (const match of fact.matchAll(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/g)) {
      const [, day, month, year] = match;
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      if (
        date.getUTCFullYear() === Number(year) &&
        date.getUTCMonth() === Number(month) - 1 &&
        date.getUTCDate() === Number(day)
      ) found.set(match[0], date);
    }
  }
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dates = [...found].map(([raw, date]) => ({ raw, date }));
  return {
    past: dates.filter((item) => item.date.getTime() < today).sort((a, b) => b.date.getTime() - a.date.getTime()),
    future: dates.filter((item) => item.date.getTime() >= today).sort((a, b) => a.date.getTime() - b.date.getTime()),
  };
}

function readableDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export function fallbackIntake(
  problem: string,
  exchanges: IntakeExchange[],
  documentFacts: string[] = [],
): IntakeState {
  const answers = exchanges.map((item) => item.answer);
  const lower = `${problem} ${answers.join(" ")} ${documentFacts.join(" ")}`.toLowerCase();
  const practices: Array<[IntakeState["practice"], string[]]> = [
    ["Employment", ["employer", "job", "dismiss", "salary", "workplace", "employeur", "licenci", "salaire", "travail", "prud'hom"]],
    ["Family", ["divorce", "custody", "marriage", "child", "separation", "séparation", "garde", "enfant", "pension"]],
    ["Housing", ["landlord", "tenant", "rent", "eviction", "lease", "propriétaire", "locataire", "loyer", "expulsion", "copropriété"]],
    ["Immigration", ["visa", "permit", "residency", "citizenship", "asylum", "titre de séjour", "étranger", "asile", "naturalisation"]],
    ["Criminal", ["police", "arrest", "charged", "criminal", "court", "pénal", "garde à vue", "plainte", "violence"]],
    ["Injury", ["injury", "accident", "hospital", "insurance", "medical", "préjudice", "corporel", "assurance"]],
    ["Estates", ["will", "probate", "inheritance", "estate", "succession", "héritage", "testament"]],
    ["Technology", ["software", "privacy", "data", "copyright", "trademark", "logiciel", "données", "rgpd", "marque"]],
    ["Business", ["business", "company", "contract", "startup", "shareholder", "société", "contrat", "associé", "commercial"]],
  ];
  const practice =
    practices.find(([, words]) => words.some((word) => lower.includes(word)))?.[0] ||
    "Other";
  const hasDocumentEvidence = documentFacts.length > 0;
  const hasLocation = /\b(?:basel|switzerland|swiss|france|paris|germany|belgium|italy|spain|uk|united kingdom|london|city|country)\b/i.test(lower);
  const isTermination = /\b(?:terminated|termination|dismissed|dismissal|fired|notice period|licenci\w*|préavis|rupture du contrat)\b/i.test(lower);
  const timeline = documentDates(documentFacts);
  const latestPastDate = timeline.past[0];
  const nextFutureDate = timeline.future[0];
  const latestExchange = exchanges.at(-1);
  const latestWasNonAnswer = Boolean(
    latestExchange && !isMeaningfulIntakeAnswer(latestExchange.answer),
  );
  const meaningfulExchanges = exchanges.filter((item) => isMeaningfulIntakeAnswer(item.answer));
  const temporalQuestion = latestPastDate
    ? `The document mentions ${readableDate(latestPastDate.date)}, which has passed. What happened on or after that date?`
    : nextFutureDate
      ? `The document mentions ${readableDate(nextFutureDate.date)}. What action, if any, has already been taken for it?`
      : "Is there a deadline, hearing, or anything requiring action soon?";
  const prompts = hasDocumentEvidence
    ? [
        "Which allegations or requests in the document do you dispute, and why?",
        "What outcome would you like the lawyer to help you achieve?",
        temporalQuestion,
        "Is the document’s description of the parties and events accurate, or is anything important missing?",
        "Is there anything else the lawyer should know before reviewing the document?",
      ]
    : [
        "What specifically happened, and what decision or action do you disagree with?",
        "Where did this happen, or which country or city is the matter connected to?",
        "Is there a deadline, hearing, expiry date, or anything requiring action soon?",
        "What outcome would you ideally like the lawyer to help you achieve?",
        "Who else is involved? Names help the lawyer perform an initial conflict check.",
      ];
  const frenchCity = lower.match(/\b(paris|lyon|marseille|bordeaux|lille|toulouse|nantes|rennes|nice|strasbourg|montpellier)\b/i)?.[1];
  const inferredJurisdiction = frenchCity
    ? `France (${frenchCity[0].toUpperCase()}${frenchCity.slice(1)})`
    : /\b(?:basel|switzerland|swiss|suisse|bâle)\b/i.test(lower)
      ? "Switzerland (Basel)"
      : "Not confirmed";
  const conversationalPrompts = hasDocumentEvidence
    ? prompts
    : isTermination
      ? [
          "Was the termination effective immediately, or are you being required to work through a shorter notice period?",
          "How was the termination communicated, and does the written notice give a reason or effective date?",
          "What would you most want a lawyer to pursue: keeping the role, enforcing the notice period, compensation, or a negotiated exit?",
          "What is the employer’s name for the lawyer’s conflict check?",
        ]
      : prompts;
  const fallbackUnderstandingTarget = hasDocumentEvidence || isTermination ? 4 : 5;
  const ready = meaningfulExchanges.length >= fallbackUnderstandingTarget;
  let nextQuestion = ready ? "" : conversationalPrompts[Math.min(meaningfulExchanges.length, conversationalPrompts.length - 1)];
  let acknowledgement = hasDocumentEvidence
    ? meaningfulExchanges.length
      ? "I’ve added that point to the facts taken from the document."
      : "I’ve reviewed the document and identified the main procedural facts."
    : meaningfulExchanges.length
      ? "I’ve added that detail to the brief."
      : "I understand. I’ll ask a few focused questions to identify the right lawyer.";
  if (latestWasNonAnswer && latestExchange) {
    if (/deadline|urgent|hearing|date/i.test(latestExchange.question) && latestPastDate) {
      acknowledgement = `The document gives ${readableDate(latestPastDate.date)}; that date has already passed.`;
      nextQuestion = `Did the scheduled step take place, and what has happened in the matter since then?`;
    } else {
      acknowledgement = "I’ll rely on the document where it answers that point.";
      nextQuestion = temporalQuestion;
    }
  }
  return {
    practice,
    legalDomain: practice === "Employment" ? "Droit du travail" : practice,
    courtOrProcedure: practice === "Employment" ? "Conseil de prud’hommes à confirmer" : "À déterminer",
    territorialBar: frenchCity ? `Barreau de ${frenchCity[0].toUpperCase()}${frenchCity.slice(1)} à vérifier selon la procédure` : inferredJurisdiction.includes("Basel") ? "Hors marché français" : "Barreau territorial à confirmer",
    applicableLaw: frenchCity ? "Droit français probable, à confirmer" : inferredJurisdiction.includes("Basel") ? "Droit suisse probable, à confirmer" : "Droit applicable à confirmer",
    dispute: isTermination
      ? "Employment termination appears inconsistent with the contractual notice period"
      : problem.trim().replace(/\s+/g, " "),
    summary: isTermination
      ? `The client says their employer terminated the employment relationship despite a contractual three-month notice period. The matter appears connected to ${inferredJurisdiction === "Not confirmed" ? "a jurisdiction not yet confirmed" : inferredJurisdiction}. Repere is clarifying how the termination operates in practice and what outcome the client wants.`
      : problem.trim().replace(/\s+/g, " "),
    keyFacts: isTermination
      ? [
          "The employer communicated a termination.",
          "The client says the contract provides a three-month notice period.",
          ...(inferredJurisdiction !== "Not confirmed" ? [`The matter is connected to ${inferredJurisdiction}.`] : []),
          ...answers.filter(isMeaningfulIntakeAnswer),
        ].slice(0, 6)
      : [problem, ...documentFacts, ...answers].filter(Boolean).slice(0, 6),
    jurisdiction: inferredJurisdiction !== "Not confirmed" ? inferredJurisdiction : (hasLocation ? problem : answers[1] || "Not confirmed"),
    incidentLocation: frenchCity ? frenchCity[0].toUpperCase() + frenchCity.slice(1) : inferredJurisdiction.includes("Basel") ? "Basel" : answers[1] || "Not confirmed",
    urgency: /tomorrow|today|48 hour|police|arrest|hearing/i.test(lower)
      ? "Urgent"
      : /deadline|week|expire|notice/i.test(lower)
        ? "Time-sensitive"
        : "Standard",
    deadline: isTermination ? "No deadline confirmed" : answers[2] || "No deadline confirmed",
    desiredOutcome: isTermination ? answers[2] || "Understand options and next steps" : (hasDocumentEvidence ? answers[1] : answers[3]) || "Understand options and next steps",
    parties: isTermination ? answers[3] || "Not provided" : answers[4] || "Not provided",
    language: "English",
    meetingFormat: "Video call",
    missingInformation: ready ? ["Relevant documents"] : [],
    ready,
    assistantMessage: ready
      ? "I have enough context to prepare a clear brief and identify suitable lawyers."
      : isTermination && !meaningfulExchanges.length
        ? `I understand that the contract appears to promise three months’ notice, but the employer has ended the relationship today. ${nextQuestion}`
        : `${acknowledgement} ${nextQuestion}`.trim(),
    acknowledgement,
    nextQuestion,
    options: [],
  };
}
