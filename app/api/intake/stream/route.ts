import { google } from "@ai-sdk/google";
import { Output, streamText } from "ai";
import { intakeStateSchema, MAX_INTAKE_TURNS, type IntakeExchange } from "@/lib/intake";
import { compactDocumentEvidence, getIntakeDocuments, type IntakeDocumentRef } from "@/lib/intake-documents";

export const runtime = "nodejs";
export const maxDuration = 120;

const encoder = new TextEncoder();

function clean(value: unknown, max: number) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function event(type: string, data: Record<string, unknown>) {
  return encoder.encode(`${JSON.stringify({ type, ...data })}\n`);
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
    ? body.exchanges.slice(0, MAX_INTAKE_TURNS).map((item: IntakeExchange) => ({
        question: clean(item?.question, 700),
        answer: clean(item?.answer, 1200),
      }))
    : [];
  const documentRefs: IntakeDocumentRef[] = Array.isArray(body.documents)
    ? body.documents.slice(0, 3).map((item: IntakeDocumentRef) => ({
        id: clean(item?.id, 80),
        token: clean(item?.token, 128),
      }))
    : [];

  if (problem.length < 15)
    return Response.json({ error: locale === "fr" ? "Décrivez un peu plus votre situation." : "Please describe your situation in a little more detail." }, { status: 400 });

  const documents = await getIntakeDocuments(documentRefs);
  const documentEvidence = compactDocumentEvidence(
    documents as Array<{ filename: string; analysis: Record<string, unknown> }>,
  );
  const history = exchanges
    .map((item, index) => `${index + 1}. Assistant: ${item.question}\nClient: ${item.answer}`)
    .join("\n\n");
  const today = new Date().toISOString().slice(0, 10);

  console.log(JSON.stringify({
    level: "info", msg: "ai_generation_started", route: "/api/intake/stream",
    requestId, generationId, model: "gemini-3.5-flash", turns: exchanges.length,
    documents: documents.length,
  }));

  const result = streamText({
    model: google.interactions("gemini-3.5-flash"),
    output: Output.object({ schema: intakeStateSchema }),
    maxOutputTokens: 2200,
    temperature: 0.2,
    system: `You are Meet, a highly attentive legal-intake conversationalist for the French legal market. Today is ${today}. Never give legal advice, decide who is right, or predict an outcome. ${locale === "fr" ? "Every user-facing field MUST be in natural French. Never use English." : "Every user-facing field must be in English."}

CONVERSATION QUALITY
assistantMessage is the actual reply shown to the client. Write a genuine, warm, concise conversational turn of 2 to 4 sentences: (1) acknowledge the specific new information in your own words, (2) explain one useful inference or show how it changes your understanding, and (3) only if genuinely necessary, ask exactly one focused question. Never recite a checklist, never announce processing, never say you are preparing a shortlist, and never ask the client to repeat facts present in a document. Vary phrasing naturally. If the client gives a short or frustrated answer, respond to it directly rather than moving mechanically to another standard question.

DOCUMENT GROUNDING
The attached document evidence is authoritative only as to what the document states. Use it fully before asking anything. Extract parties, dispute object, claims, dates, court, procedure and territorial connection from it. Distinguish allegations from established facts. If information is already present, state what you understood instead of asking for it. Ask only about the client's personal position, later events, objective, or an ambiguity that materially changes lawyer matching. Interpret dates relative to today; never ask whether an obviously past deadline is urgent—ask what happened after it only if that matters.

FRENCH ROUTING
Identify the precise field of French law, relevant judicial or administrative order, likely court/procedure, geographic jurisdiction and potentially relevant bar only when supported. Do not infer bar membership. Geographic jurisdiction belongs in jurisdiction; court/procedure belongs in courtOrProcedure.

LIVE CASE MODEL
Update every structured field from the full conversation and documents. summary is a neutral, evolving 90-160 word explanation, not a transcript. keyFacts are concrete facts. missingInformation contains only consequential unknowns. nextQuestion is exactly the final question in assistantMessage, or empty. options should normally be empty. Set ready=true as soon as there is enough information for responsible matching; no minimum number of questions. On the safety-limit turn (${MAX_INTAKE_TURNS}), finish without inventing facts.`,
    prompt: `Initial client message:\n${problem}\n\nConversation so far:\n${history || "No follow-up yet."}\n\nAttached document evidence:\n${documentEvidence || "No document attached."}\n\nReturn the updated intake state.`,
    onError({ error }) {
      console.error(JSON.stringify({
        level: "error", msg: "ai_generation_stream_error", route: "/api/intake/stream",
        requestId, generationId, error: error instanceof Error ? error.message : String(error),
        ms: Date.now() - startedAt,
      }));
    },
  });

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(event("trace", { generationId, stage: "understanding", label: locale === "fr" ? "Compréhension de votre message" : "Understanding your message" }));
      try {
        for await (const partial of result.partialOutputStream) {
          if (!firstOutputAt) firstOutputAt = Date.now();
          controller.enqueue(event("partial", { generationId, intake: partial }));
        }
        const [output, usage] = await Promise.all([result.output, result.usage]);
        const durationMs = Date.now() - startedAt;
        const ttftMs = firstOutputAt ? firstOutputAt - startedAt : null;
        controller.enqueue(event("complete", {
          generationId,
          intake: output,
          trace: { model: "gemini-3.5-flash", durationMs, ttftMs, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens },
        }));
        console.log(JSON.stringify({
          level: "info", msg: "ai_generation_completed", route: "/api/intake/stream",
          requestId, generationId, model: "gemini-3.5-flash", durationMs, ttftMs,
          inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.enqueue(event("error", { generationId, message: locale === "fr" ? "La réponse n’a pas pu être générée. Vous pouvez réessayer sans perdre la conversation." : "The reply could not be generated. You can retry without losing the conversation." }));
        console.error(JSON.stringify({
          level: "error", msg: "ai_generation_failed", route: "/api/intake/stream",
          requestId, generationId, error: message, ms: Date.now() - startedAt,
        }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
