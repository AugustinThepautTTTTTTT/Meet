import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import {
  fallbackIntake,
  documentDates,
  intakeStateSchema,
  isMeaningfulIntakeAnswer,
  MAX_INTAKE_TURNS,
  type IntakeExchange,
} from "@/lib/intake";
import {
  compactDocumentEvidence,
  getIntakeDocuments,
  type IntakeDocumentRef,
} from "@/lib/intake-documents";

export const runtime = "nodejs";

function clean(value: unknown, max: number) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

const DOCUMENT_DEFERRAL = /(?:c['’]?est|tout est|cela est|ça est) (?:déjà )?(?:écrit|indiqué|précisé|mentionné) dans (?:le|l['’])(?:document|assignation)|(?:regardez|lisez|relisez|consultez) (?:le|l['’])(?:document|assignation)|(?:le|l['’])(?:document|assignation) (?:le dit|l['’]indique|le précise)/i;
const ASKS_DOCUMENT_PARTIES_OR_OBJECT = /(?:qui sont|nom(?:s)? de|identifier) (?:les )?parties|parties en présence|objet (?:exact |précis )?(?:du litige|de l['’]assignation)|nature (?:exacte )?du litige|what (?:exactly )?(?:happened|is the dispute)|who (?:are|is) (?:the )?part/i;

function groundedDocumentReply(
  documents: Array<{ analysis?: Record<string, unknown> }>,
  locale: "fr" | "en",
) {
  const analysis = documents[0]?.analysis || {};
  const parties = Array.isArray(analysis.parties)
    ? analysis.parties.map(String).filter(Boolean).slice(0, 6)
    : [];
  const facts = Array.isArray(analysis.relevantFacts)
    ? analysis.relevantFacts.map(String).filter(Boolean).slice(0, 4)
    : [];
  const disputeObject = clean(analysis.disputeObject, 360);
  const summary = clean(analysis.detailedAnalysis || analysis.summary, 900);
  const knownMatter = disputeObject && !/^not (?:reliably|separately)/i.test(disputeObject)
    ? disputeObject
    : summary;
  if (!knownMatter && parties.length === 0 && facts.length === 0) return null;

  if (locale === "fr") {
    const evidence = [
      parties.length ? `les parties identifiées sont ${parties.join(" ; ")}` : "",
      knownMatter ? `le document porte sur ${knownMatter.replace(/[.!?]+$/, "")}` : "",
    ].filter(Boolean).join(" et ");
    const nextQuestion = "Ce que l’assignation ne permet pas d’établir à votre place, c’est votre position personnelle : que contestez-vous précisément ou qu’attendez-vous de l’avocat ?";
    return {
      acknowledgement: `Vous avez raison : ces éléments figurent déjà dans l’assignation.`,
      assistantMessage: `Vous avez raison : je ne dois pas vous demander de recopier l’assignation. D’après le document, ${evidence}. ${nextQuestion}`,
      nextQuestion,
      options: [] as string[],
    };
  }
  const evidence = [
    parties.length ? `the identified parties are ${parties.join("; ")}` : "",
    knownMatter ? `the document concerns ${knownMatter.replace(/[.!?]+$/, "")}` : "",
  ].filter(Boolean).join(" and ");
  const nextQuestion = "What the document cannot establish for you is your own position: what exactly do you dispute, or what do you want the lawyer to achieve?";
  return {
    acknowledgement: "You are right: those facts are already in the document.",
    assistantMessage: `You are right: I should not ask you to copy the document. From it, ${evidence}. ${nextQuestion}`,
    nextQuestion,
    options: [] as string[],
  };
}

function frenchFallback(intake: ReturnType<typeof fallbackIntake>) {
  const questions: Record<string, string> = {
    "What specifically happened, and what decision or action do you disagree with?": "Que s’est-il précisément passé, et quelle décision ou action contestez-vous ?",
    "Was the termination effective immediately, or are you being required to work through a shorter notice period?": "Le licenciement a-t-il pris effet immédiatement, ou devez-vous effectuer un préavis plus court que celui prévu au contrat ?",
    "How was the termination communicated, and does the written notice give a reason or effective date?": "Comment le licenciement vous a-t-il été notifié, et l’écrit précise-t-il un motif ou une date d’effet ?",
    "What would you most want a lawyer to pursue: keeping the role, enforcing the notice period, compensation, or a negotiated exit?": "Quel résultat souhaitez-vous prioritairement : conserver votre poste, faire respecter le préavis, obtenir une indemnisation ou négocier votre départ ?",
    "What is the employer’s name for the lawyer’s conflict check?": "Quel est le nom de l’employeur afin que l’avocat puisse vérifier l’absence de conflit d’intérêts ?",
    "Where did this happen, or which country or city is the matter connected to?": "Dans quelle ville ou quel pays la situation se déroule-t-elle ?",
    "Is there a deadline, hearing, expiry date, or anything requiring action soon?": "Existe-t-il une audience, un délai de recours ou une autre échéance proche ?",
    "What outcome would you ideally like the lawyer to help you achieve?": "Quel résultat souhaitez-vous obtenir avec l’aide d’un avocat ?",
  };
  const nextQuestion = questions[intake.nextQuestion] || intake.nextQuestion;
  const employment = intake.practice === "Employment";
  return {
    ...intake,
    dispute: employment ? "Licenciement potentiellement incompatible avec le préavis contractuel" : intake.dispute,
    summary: employment
      ? `Le client indique que son employeur a rompu le contrat de travail sans respecter le préavis contractuel. Le dossier est rattaché à ${intake.jurisdiction}. Repere précise les modalités de la rupture et le résultat recherché afin d’identifier un avocat en droit du travail adapté.`
      : intake.summary,
    keyFacts: employment
      ? [
          "L’employeur a notifié une rupture du contrat de travail.",
          "Le client indique que le contrat prévoit un préavis de trois mois.",
          ...(intake.jurisdiction !== "Not confirmed" ? [`Le dossier est rattaché à ${intake.jurisdiction}.`] : []),
        ]
      : intake.keyFacts,
    language: "Français",
    acknowledgement: "J’ai intégré ces éléments à la synthèse de votre situation.",
    desiredOutcome: intake.desiredOutcome === "Understand options and next steps" ? "Comprendre mes options et définir la prochaine étape" : intake.desiredOutcome,
    deadline: intake.deadline === "No deadline confirmed" ? "Aucune échéance confirmée" : intake.deadline,
    nextQuestion,
    assistantMessage: intake.ready
      ? "J’ai désormais suffisamment d’éléments pour préparer votre synthèse et rechercher les avocats adaptés."
      : `J’ai intégré ce que vous venez de préciser. ${nextQuestion}`,
  };
}

export async function POST(request: Request) {
  let fallbackProblem = "";
  let fallbackExchanges: IntakeExchange[] = [];
  let fallbackDocumentFacts: string[] = [];
  let fallbackLocale: "fr" | "en" = "fr";
  try {
    const body = await request.json();
    const locale = body.locale === "en" ? "en" : "fr";
    fallbackLocale = locale;
    const problem = clean(body.problem, 2000);
    const exchanges: IntakeExchange[] = Array.isArray(body.exchanges)
      ? body.exchanges.slice(0, MAX_INTAKE_TURNS).map((item: IntakeExchange) => ({
          question: clean(item?.question, 300),
          answer: clean(item?.answer, 700),
        }))
      : [];
    const documentRefs: IntakeDocumentRef[] = Array.isArray(body.documents)
      ? body.documents.slice(0, 3).map((item: IntakeDocumentRef) => ({
          id: clean(item?.id, 80),
          token: clean(item?.token, 128),
        }))
      : [];
    const documents = await getIntakeDocuments(documentRefs);
    fallbackDocumentFacts = documents.flatMap((document) => {
      const analysis = document.analysis || {};
      return [
        analysis.summary,
        analysis.detailedAnalysis,
        analysis.disputeObject,
        analysis.procedure,
        ...(Array.isArray(analysis.claims) ? analysis.claims.slice(0, 8) : []),
        ...(Array.isArray(analysis.chronology) ? analysis.chronology.slice(0, 16) : []),
        ...(Array.isArray(analysis.legalIssues) ? analysis.legalIssues.slice(0, 10) : []),
        ...(Array.isArray(analysis.relevantFacts) ? analysis.relevantFacts.slice(0, 6) : []),
        ...(Array.isArray(analysis.dates) ? analysis.dates.slice(0, 4) : []),
        ...(Array.isArray(analysis.parties) ? analysis.parties.slice(0, 6) : []),
      ].filter(Boolean).map(String);
    });
    const documentEvidence = compactDocumentEvidence(
      documents as Array<{ filename: string; analysis: Record<string, unknown> }>,
    );
    fallbackProblem = problem;
    fallbackExchanges = exchanges;
    if (problem.length < 15)
      return NextResponse.json(
        { error: "Please describe what happened in a little more detail." },
        { status: 400 },
      );

    const rawFallback = fallbackIntake(problem, exchanges, fallbackDocumentFacts);
    const fallback = locale === "fr" ? frenchFallback(rawFallback) : rawFallback;
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY)
      return NextResponse.json({ intake: fallback, source: "fallback" });

    const forceReady = exchanges.filter((item) => isMeaningfulIntakeAnswer(item.answer)).length >= MAX_INTAKE_TURNS;
    const today = new Date().toISOString().slice(0, 10);
    const timeline = documentDates(fallbackDocumentFacts);
    const pastDocumentDates = timeline.past.map((item) => item.raw).join(", ");
    const compactHistory = exchanges
      .map((item, index) => `${index + 1}. Q:${item.question}\nA:${item.answer}`)
      .join("\n");
    const { output, usage } = await generateText({
      model: google("gemini-3.5-flash"),
      output: Output.object({ schema: intakeStateSchema }),
      maxOutputTokens: 1600,
      temperature: 0.1,
      system: `You are Repere, an attentive legal-intake conversationalist specialised in the French legal market. Extract facts but never give legal advice or predict outcomes. Today is ${today}. ${locale === "fr" ? "Write every user-facing and structured text field in natural, clear French." : "Write every field in English, while applying French-market analysis when France is relevant."}

FRENCH LEGAL ROUTING
When the matter is connected to France, identify the precise substantive field where supported: droit du travail, famille, immobilier/copropriété, affaires/sociétés, commercial, pénal, étrangers, public/administratif, fiscal, social, propriété intellectuelle, numérique/données, responsabilité/préjudice corporel, or successions. Distinguish the judicial and administrative orders. Identify a likely court or procedure only when evidence supports it: tribunal judiciaire and its specialised judges, conseil de prud’hommes, tribunal de commerce, tribunal administratif, criminal court, appeal, enforcement, or alternative dispute resolution. Extract the geographic connection and likely competent court. territorialBar identifies a relevant French bar only when a court/location or verified credential supports it. Do not imply that a lawyer may advise only in their city: distinguish free choice, advice and pleading from territorial postulation where representation is required. Never infer bar membership from office location alone; mark it for verification. Keep legalDomain, courtOrProcedure, territorialBar and applicableLaw concise and express uncertainty honestly.
The jurisdiction field is always geographic (for example "France — Paris" or "France — Lyon"); never put only "judiciaire" or "administratif" there. Put the judicial order and court in courtOrProcedure.

CONVERSATION FIRST
Talk with the person; do not conduct a questionnaire. assistantMessage is the complete user-facing reply. It should be 1-3 natural sentences that respond specifically to what the person just said, briefly share a useful inference or understanding, and—only when it would materially improve the lawyer brief or match—end with one focused question. Vary your language naturally. Never announce fields, a checklist, an intake process, or how many questions remain. Do not ask a standard question merely because a field is empty. If enough is known, set ready=true, leave nextQuestion empty, and use assistantMessage to explain in plain language what you understood and that you can now find suitable lawyers.

EVIDENCE-LED REASONING
Infer everything reasonably supported by the conversation and documents. Treat replies such as "you tell me", "I don't know", "not sure", "c'est écrit dans l'assignation" and "regardez le document" as requests to explain what the evidence establishes, then ask only what the evidence cannot establish. Before asking about parties, the object of a dispute, a court, a date or a claim, explicitly check Attached document evidence. Never ask the user to transcribe or repeat information already present there. If the user points you back to a document, acknowledge it, state the relevant names and facts you found, and ask only for the user's personal position, subsequent events, or desired outcome if still consequential. Interpret every document date relative to today. If a date is past, say so and ask what happened afterward only if the subsequent procedural status matters. Never ask the user to confirm a document's own contents generally. Distinguish allegations from confirmed facts and preserve uncertainty. Never repeat a question already answered. A follow-up must change at least one of: the nature of the dispute, applicable jurisdiction, procedural urgency, desired outcome, lawyer expertise, language, or conflict check. Otherwise finish.

SILENT CASE MODEL
Update all structured fields in the background on every turn. The summary is a concise, neutral, evolving explanation of the problem in 60-120 words—not a transcript. keyFacts contains only concrete high-value facts. missingInformation contains only consequential unresolved points, not a generic checklist. Use one allowed practice label. dispute is one precise sentence. acknowledgement is a short extraction of the conversational opening for compatibility. nextQuestion contains only the final question from assistantMessage, or empty when there is none. Options are exceptional and must be case-grounded; normally return []. Do not ask for home addresses, IDs, banking data, or unnecessary sensitive information. ${forceReady ? "This is the safety-limit turn: set ready=true and nextQuestion empty, then summarize what is known without inventing missing facts." : "Set ready=true as soon as the matter is sufficiently understood for a responsible lawyer match; there is no minimum number of questions."}`,
      prompt: `Initial problem: ${problem}\nToday: ${today}\n${pastDocumentDates ? `Document dates already in the past: ${pastDocumentDates}\n` : ""}${compactHistory ? `Answers so far:\n${compactHistory}` : "No follow-up answers yet."}\n${documentEvidence ? `Attached document evidence:\n${documentEvidence}` : "No documents attached."}\nReturn the compact intake state.`,
    });
    const unsafeQuestion =
      /how much|amount|salary|income|bank|account number|home address|passport|identity|id number|social security|upload|send (?:a )?document|montant|salaire|revenu|iban|compte bancaire|adresse personnelle|pièce d'identité/i.test(
        output.nextQuestion,
      );
    const privacySafeOutput = unsafeQuestion
      ? (() => {
          const askParty = output.parties === "Not provided" || output.parties === "Non renseigné" ||
            /^(employer|company|partner|landlord|tenant|authority|unknown|employeur|société|partenaire|propriétaire|locataire|autorité|inconnu)/i.test(output.parties);
          const nextQuestion = askParty
            ? locale === "fr" ? "Quel est le nom de l’autre personne ou organisation pour permettre la vérification des conflits d’intérêts ?" : "What is the name of the other person or organisation for the lawyer’s conflict check?"
            : locale === "fr" ? "Existe-t-il une échéance ou une audience connue que l’avocat doit traiter en priorité ?" : "Is there any known deadline or hearing date the lawyer should prioritise?";
          return {
            ...output,
            acknowledgement: locale === "fr" ? "J’ai identifié les éléments qui déterminent le type d’avocat à rechercher." : "I’ve identified the facts that determine the type of lawyer to find.",
            assistantMessage: `${locale === "fr" ? "J’ai identifié les éléments qui déterminent le type d’avocat à rechercher." : "I’ve identified the facts that determine the type of lawyer to find."} ${nextQuestion}`,
            nextQuestion,
            options: [],
          };
        })()
      : output;
    const repeated = exchanges.some((item) => {
      const oldWords = item.question.toLowerCase().split(/\W+/).filter(Boolean);
      const next = privacySafeOutput.nextQuestion.toLowerCase();
      return oldWords.length > 3 && oldWords.filter((word) => next.includes(word)).length / oldWords.length > 0.6;
    });
    const genericDeadlineQuestion = /are any deadlines|is (?:there|the) (?:a )?(?:deadline|hearing).*urgent/i.test(
      privacySafeOutput.nextQuestion,
    );
    const dateAwareOutput = genericDeadlineQuestion && timeline.past[0]
      ? {
          ...privacySafeOutput,
          acknowledgement: locale === "fr" ? `La date du ${timeline.past[0].raw} mentionnée dans le document est passée.` : `The document date ${timeline.past[0].raw} has already passed.`,
          nextQuestion: locale === "fr" ? "Cette étape a-t-elle eu lieu et que s’est-il passé dans le dossier depuis ?" : "Did that scheduled step take place, and what has happened in the matter since then?",
          assistantMessage: locale === "fr" ? `Le document mentionne le ${timeline.past[0].raw}, une date désormais passée. Cette étape a-t-elle eu lieu et que s’est-il passé depuis ?` : `The document identifies ${timeline.past[0].raw}, which has already passed. Did that scheduled step take place, and what has happened in the matter since then?`,
          options: [],
        }
      : privacySafeOutput;
    const latestAnswer = exchanges.at(-1)?.answer || "";
    const asksKnownDocumentFact = ASKS_DOCUMENT_PARTIES_OR_OBJECT.test(dateAwareOutput.nextQuestion);
    const groundedReply = documentEvidence &&
      (DOCUMENT_DEFERRAL.test(latestAnswer) || asksKnownDocumentFact)
      ? groundedDocumentReply(documents as Array<{ analysis?: Record<string, unknown> }>, locale)
      : null;
    const evidenceAwareOutput = groundedReply
      ? { ...dateAwareOutput, ...groundedReply, ready: false }
      : dateAwareOutput;
    const firstTurnPrematureFinish = exchanges.length === 0 && evidenceAwareOutput.ready;
    const firstTurnOutput = firstTurnPrematureFinish
      ? {
          ...evidenceAwareOutput,
          ready: false,
          assistantMessage: `${evidenceAwareOutput.assistantMessage} ${locale === "fr" ? "Quelle conséquence concrète cette situation a-t-elle pour vous aujourd’hui ?" : "What important practical consequence is this situation having for you now?"}`,
          nextQuestion: locale === "fr" ? "Quelle conséquence concrète cette situation a-t-elle pour vous aujourd’hui ?" : "What important practical consequence is this situation having for you now?",
          options: [],
        }
      : evidenceAwareOutput;
    const resolvedOutput =
      forceReady || (repeated && !groundedReply)
        ? { ...firstTurnOutput, ready: true, nextQuestion: "", options: [] }
        : {
            ...firstTurnOutput,
            options:
              firstTurnOutput.options.length >= 2
                ? firstTurnOutput.options
                : [],
          };
    return NextResponse.json({
      intake: resolvedOutput,
      source: "gemini",
      usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens },
    });
  } catch (error) {
    console.error("intake_generation_failed", error);
    if (fallbackProblem) {
      return NextResponse.json({
        intake: fallbackLocale === "fr"
          ? frenchFallback(fallbackIntake(fallbackProblem, fallbackExchanges, fallbackDocumentFacts))
          : fallbackIntake(fallbackProblem, fallbackExchanges, fallbackDocumentFacts),
        source: "fallback",
      });
    }
    return NextResponse.json(
      { error: "Repere n’a pas pu poursuivre l’analyse." },
      { status: 500 },
    );
  }
}
