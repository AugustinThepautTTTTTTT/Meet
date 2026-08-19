export type CaseBrief = {
  summary: string;
  dispute?: string;
  keyFacts?: string[];
  conversation?: Array<{
    role: "client" | "assistant";
    content: string;
  }>;
  practice: string;
  legalDomain?: string;
  courtOrProcedure?: string;
  territorialBar?: string;
  applicableLaw?: string;
  jurisdiction: string;
  urgency: "Standard" | "Time-sensitive" | "Urgent";
  deadline: string;
  desiredOutcome: string;
  language: string;
  meetingFormat: string;
  parties: string;
  timeline: string[];
  missingInformation: string[];
  documents?: Array<{
    id: string;
    filename: string;
    documentType: string;
    summary: string;
    relevantFacts: string[];
    dates: string[];
    parties: string[];
    detailedAnalysis?: string;
    chronology?: string[];
    legalIssues?: string[];
    claims?: string[];
    procedure?: string;
    uncertainties?: string[];
  }>;
};

const urgentWords = [
  "arrest",
  "police",
  "detained",
  "court tomorrow",
  "unsafe",
  "violence",
  "emergency",
];
const deadlineWords = [
  "deadline",
  "court date",
  "hearing",
  "expires",
  "eviction",
  "dismissed",
  "termination",
];

export function createCaseBrief(problem: string, practice: string): CaseBrief {
  const clean = problem.trim().replace(/\s+/g, " ");
  const lower = clean.toLowerCase();
  const urgency = urgentWords.some((word) => lower.includes(word))
    ? "Urgent"
    : deadlineWords.some((word) => lower.includes(word))
      ? "Time-sensitive"
      : "Standard";
  return {
    summary: clean,
    practice,
    legalDomain: practice,
    courtOrProcedure: "À déterminer",
    territorialBar: "À confirmer selon la juridiction et la procédure",
    applicableLaw: "Droit applicable à confirmer",
    jurisdiction: "Non précisée",
    urgency,
    deadline:
      urgency === "Standard"
        ? "Aucune échéance indiquée"
        : "Échéance mentionnée — date à confirmer",
    desiredOutcome: "Comprendre mes options et définir la prochaine étape",
    language: "Français",
    meetingFormat: "Visioconférence",
    parties: "Non renseigné",
    timeline: ["Le client a décrit sa situation à Repere"],
    missingInformation: [
      "Juridiction exacte",
      "Noms nécessaires à la vérification des conflits d’intérêts",
      "Documents utiles",
    ],
  };
}
