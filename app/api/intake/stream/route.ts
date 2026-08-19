import { google } from "@ai-sdk/google";
import { Output, streamText } from "ai";
import { intakeStateSchema, MAX_INTAKE_TURNS, type IntakeExchange } from "@/lib/intake";
import { compactDocumentEvidence, getIntakeDocuments, type IntakeDocumentRef } from "@/lib/intake-documents";

export const runtime = "nodejs";
export const maxDuration = 120;

const encoder = new TextEncoder();
const caseStateSchema = intakeStateSchema.omit({ assistantMessage: true, acknowledgement: true, nextQuestion: true, options: true });

function clean(value: unknown, max: number) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}
function event(type: string, data: Record<string, unknown>) {
  return encoder.encode(`${JSON.stringify({ type, ...data })}\n`);
}
function finalQuestion(text: string) {
  return text.match(/[^.!?]*\?/g)?.at(-1)?.trim() || "";
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const generationId = crypto.randomUUID();
  const requestId = request.headers.get("x-vercel-id") || generationId;
  let firstOutputAt: number | null = null;

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    return Response.json({ error: "Gemini n’est pas configuré." }, { status: 503 });

  const body = await request.json();
  const locale = body.locale === "en" ? "en" : "fr";
  const problem = clean(body.problem, 3000);
  const exchanges: IntakeExchange[] = Array.isArray(body.exchanges)
    ? body.exchanges.slice(0, MAX_INTAKE_TURNS).map((item: IntakeExchange) => ({ question: clean(item?.question, 700), answer: clean(item?.answer, 1200) }))
    : [];
  const documentRefs: IntakeDocumentRef[] = Array.isArray(body.documents)
    ? body.documents.slice(0, 3).map((item: IntakeDocumentRef) => ({ id: clean(item?.id, 80), token: clean(item?.token, 128) }))
    : [];
  if (problem.length < 15)
    return Response.json({ error: locale === "fr" ? "Décrivez un peu plus votre situation." : "Please describe your situation in a little more detail." }, { status: 400 });

  const documents = await getIntakeDocuments(documentRefs);
  const documentEvidence = compactDocumentEvidence(documents as Array<{ filename: string; analysis: Record<string, unknown> }>);
  const history = exchanges.map((item, index) => `${index + 1}. Assistant: ${item.question}\nClient: ${item.answer}`).join("\n\n");
  const today = new Date().toISOString().slice(0, 10);
  const context = `Initial client message:\n${problem}\n\nConversation so far:\n${history || "No follow-up yet."}\n\nAttached document evidence:\n${documentEvidence || "No document attached."}`;

  console.log(JSON.stringify({ level: "info", msg: "ai_generation_started", route: "/api/intake/stream", requestId, generationId, model: "gemini-3.5-flash", turns: exchanges.length, documents: documents.length }));

  const createReplyResult = (state: Record<string, unknown>) => streamText({
    model: google("gemini-3.5-flash-lite"),
    providerOptions: { google: { thinkingConfig: { thinkingLevel: "minimal" } } },
    maxOutputTokens: 500,
    system: `You are Repere, a highly attentive legal-intake conversationalist for the French legal market. Today is ${today}. Never give legal advice, decide who is right, or predict an outcome. ${locale === "fr" ? "Reply ONLY in natural French. Never use English." : "Reply only in English."}

Write only the actual client-facing reply, with no JSON or label. The silent case assessment below has already determined that one consequential detail is still required. Use 2 to 4 natural sentences: acknowledge the specific new information, explain one useful inference or show how it changes your understanding, then ask exactly one focused question about the most important missing detail. Never recite a checklist, announce processing, or ask the client to repeat facts present in a document. Use all attached evidence first. Distinguish allegations from facts and interpret dates relative to today.`,
    prompt: `${context}\n\nSilent case assessment:\n${JSON.stringify(state)}`,
  });
  const createStateResult = () => streamText({
    model: google("gemini-3.5-flash"),
    providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } },
    output: Output.object({ schema: caseStateSchema }),
    maxOutputTokens: 1700,
    temperature: 0.1,
    system: `Build the silent legal-intake case model for France. Today is ${today}. Do not give legal advice or invent facts. ${locale === "fr" ? "Write every field in precise French." : "Write every field in English."}

Use the full document evidence before marking anything missing. Identify the precise field of law, relevant judicial or administrative order, likely court/procedure, geographic jurisdiction and potentially relevant bar only when supported. Distinguish allegations from facts and interpret dates relative to today. summary is a neutral evolving explanation of 90-160 words. keyFacts are concrete. missingInformation contains only consequential unknowns. Set ready=true as soon as there is enough information for responsible matching; there is no minimum number of turns. At ${MAX_INTAKE_TURNS} turns, finish without inventing facts.`,
    prompt: `${context}\n\nReturn only the updated silent case state.`,
  });

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(event("trace", { generationId, stage: "understanding", label: locale === "fr" ? "Lecture de votre message" : "Reading your message" }));
      try {
        let reply = "";
        let replyUsage: { inputTokens?: number; outputTokens?: number } = {};
        controller.enqueue(event("trace", { generationId, stage: "structuring", label: locale === "fr" ? "Mise à jour de votre dossier" : "Updating your case" }));
        const stateResult = createStateResult();
        for await (const partial of stateResult.partialOutputStream)
          controller.enqueue(event("partial", { generationId, intake: partial }));
        const [state, stateUsage] = await Promise.all([stateResult.output, stateResult.usage]);

        if (state.ready) {
          reply = locale === "fr"
            ? "J’ai maintenant les éléments nécessaires pour comprendre votre situation et identifier les avocats adaptés. Je prépare votre sélection à partir de votre dossier, du domaine juridique et de la juridiction concernée."
            : "I now have what I need to understand your situation and identify suitable lawyers. I’m preparing your selection using your case, the legal area and the relevant jurisdiction.";
          firstOutputAt = Date.now();
          controller.enqueue(event("text-delta", { generationId, delta: reply, text: reply }));
        } else {
          controller.enqueue(event("trace", { generationId, stage: "replying", label: locale === "fr" ? "Préparation de la prochaine question" : "Preparing the next question" }));
          const replyResult = createReplyResult(state as Record<string, unknown>);
          for await (const delta of replyResult.textStream) {
            if (!firstOutputAt) firstOutputAt = Date.now();
            reply += delta;
            controller.enqueue(event("text-delta", { generationId, delta, text: reply }));
          }
          replyUsage = await replyResult.usage;
        }

        let question = state.ready ? "" : finalQuestion(reply);
        if (!state.ready && !question) {
          const missing = clean(state.missingInformation?.[0], 320);
          question = locale === "fr"
            ? `Pouvez-vous préciser ce point${missing ? ` : ${missing}` : " pour que je puisse finaliser votre dossier"} ?`
            : `Could you clarify this point${missing ? `: ${missing}` : " so I can complete your case"}?`;
          reply = `${reply.trim()} ${question}`.trim();
          controller.enqueue(event("text-delta", { generationId, delta: ` ${question}`, text: reply }));
        }
        const output = {
          ...state,
          assistantMessage: reply.trim(),
          acknowledgement: reply.split(/(?<=[.!?])\s+/)[0] || reply.trim(),
          nextQuestion: question,
          options: [],
          ready: state.ready,
        };
        const durationMs = Date.now() - startedAt;
        const ttftMs = firstOutputAt ? firstOutputAt - startedAt : null;
        const inputTokens = (stateUsage.inputTokens || 0) + (replyUsage.inputTokens || 0);
        const outputTokens = (stateUsage.outputTokens || 0) + (replyUsage.outputTokens || 0);
        controller.enqueue(event("complete", { generationId, intake: output, trace: { model: "gemini-3.5-flash", durationMs, ttftMs, inputTokens, outputTokens } }));
        console.log(JSON.stringify({ level: "info", msg: "ai_generation_completed", route: "/api/intake/stream", requestId, generationId, model: "gemini-3.5-flash", durationMs, ttftMs, inputTokens, outputTokens }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.enqueue(event("error", { generationId, message: locale === "fr" ? "La réponse n’a pas pu être générée. Vous pouvez réessayer sans perdre la conversation." : "The reply could not be generated. You can retry without losing the conversation." }));
        console.error(JSON.stringify({ level: "error", msg: "ai_generation_failed", route: "/api/intake/stream", requestId, generationId, error: message, ms: Date.now() - startedAt }));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}
