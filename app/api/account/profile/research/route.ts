import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccountId } from "@/lib/auth";
import { getLawyerDb } from "@/lib/database";
import { ensureLawyerWorkflowSchema } from "@/lib/workflow-schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const profileResearchSchema = z.object({
  confidence: z.enum(["high", "medium", "low"]),
  identityNote: z.string(),
  name: z.string(),
  specialty: z.string(),
  practice: z.enum([
    "Employment",
    "Family",
    "Housing",
    "Business",
    "Immigration",
    "Criminal",
    "Injury",
    "Estates",
    "Technology",
  ]),
  location: z.string(),
  firm_name: z.string(),
  tagline: z.string(),
  languages: z.string(),
  tags: z.array(z.string()).max(8),
  experience: z.string(),
  credentials: z.string(),
  education: z.string(),
  awards: z.array(z.string()).max(6),
  services: z.array(z.string()).max(8),
  bio: z.string(),
  reasons: z.array(z.string()).max(4),
  website: z.string(),
  linkedin: z.string(),
  consultation_format: z.string(),
  unsupportedClaims: z.array(z.string()).max(8),
});

function clean(value: unknown, max = 500) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function safeUrl(value: unknown) {
  const url = clean(value, 500);
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const accountId = await getAccountId();
  if (!accountId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    return NextResponse.json({ error: "AI profile research is not configured." }, { status: 503 });

  try {
    const body = await request.json();
    if (body.confirmIdentity !== true)
      return NextResponse.json(
        { error: "Confirm that you are researching your own professional profile." },
        { status: 400 },
      );
    await ensureLawyerWorkflowSchema();
    const sql = getLawyerDb();
    const [[account], [existing], [recent]] = await Promise.all([
      sql`SELECT name FROM lawyer_accounts WHERE id=${accountId}`,
      sql`SELECT name,location,firm_name,website,linkedin FROM lawyers WHERE account_id=${accountId}`,
      sql`SELECT created_at FROM profile_research_runs WHERE account_id=${accountId} ORDER BY created_at DESC LIMIT 1`,
    ]);
    if (!account)
      return NextResponse.json({ error: "Lawyer account not found." }, { status: 404 });
    if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000)
      return NextResponse.json(
        { error: "Please wait one minute before running another web research." },
        { status: 429 },
      );

    const name = clean(body.name || existing?.name || account.name, 120);
    const firm = clean(body.firm || existing?.firm_name, 160);
    const location = clean(body.location || existing?.location, 120);
    const website = safeUrl(body.website || existing?.website);
    const linkedin = safeUrl(body.linkedin || existing?.linkedin);
    if (name.length < 4)
      return NextResponse.json({ error: "Enter your full professional name." }, { status: 400 });

    const query = [name, firm, location, website, linkedin].filter(Boolean).join(" · ");
    const research = await generateText({
      model: google("gemini-2.5-flash"),
      tools: { google_search: google.tools.googleSearch({}) as never },
      maxOutputTokens: 2400,
      temperature: 0.1,
      system: "Research a lawyer's public professional profile. Search multiple authoritative sources: official law-firm biography, bar or regulator directory, professional directory, university or publication pages, and LinkedIn only when publicly accessible. Resolve identity carefully using firm, city and supplied URLs. Exclude home addresses, private phone numbers, family information, personal social media and unverifiable marketing claims. Never invent awards, case outcomes, years of experience, client claims or practice areas. Cite every factual paragraph and explicitly list uncertainty or conflicting sources.",
      prompt: `Research this lawyer for a public profile draft.\nName: ${name}\nFirm: ${firm || "Not supplied"}\nLocation: ${location || "Not supplied"}\nOfficial website: ${website || "Not supplied"}\nLinkedIn: ${linkedin || "Not supplied"}\nReturn a concise research dossier with current role, admissions, practice, services, locations, languages, career timeline, education, recognition, and authoritative URLs.`,
    });
    const researchText = clean(research.text, 20_000);
    if (researchText.length < 100)
      return NextResponse.json({ error: "Not enough reliable public information was found. Add an official profile URL and retry." }, { status: 422 });

    const sources = research.sources
      .flatMap((source) => source.sourceType === "url" ? [{
        url: source.url,
        domain: new URL(source.url).hostname.replace(/^www\./, ""),
        title: clean(source.title || new URL(source.url).hostname, 140),
      }] : [])
      .slice(0, 10);
    const { output } = await generateText({
      model: google("gemini-2.5-flash"),
      output: Output.object({ schema: profileResearchSchema }),
      maxOutputTokens: 1400,
      temperature: 0.1,
      system: `Turn a sourced research dossier into an editable lawyer profile. Use only facts explicitly supported by the dossier. Prefer current official sources over directories. Avoid superlatives, promises, ratings, case outcomes and unverifiable client claims. Keep the bio neutral, polished and 100-160 words. Reasons should describe verifiable fit, not praise. If a field is unsupported, leave it empty and list it in unsupportedClaims. Never infer languages, awards, admission, pricing or years of experience. consultation_format must be empty unless sourced. Classify practice using one allowed label.`,
      prompt: `Expected identity: ${query}\n\nSOURCED WEB RESEARCH START\n${researchText}\nSOURCED WEB RESEARCH END\n\nKnown source URLs:\n${sources.map((source) => `- ${source.title}: ${source.url}`).join("\n")}`,
    });
    if (output.confidence === "low")
      return NextResponse.json(
        { error: "Meet found multiple possible identities. Add your firm, city or official profile URL and retry.", identityNote: output.identityNote },
        { status: 422 },
      );
    const safeDraft = {
      ...output,
      website: safeUrl(output.website) || website,
      linkedin: safeUrl(output.linkedin) || linkedin,
    };
    await sql`
      INSERT INTO profile_research_runs (account_id,query,draft,sources)
      VALUES (${accountId},${query},${JSON.stringify(safeDraft)}::jsonb,${JSON.stringify(sources)}::jsonb)
    `;
    return NextResponse.json({ draft: safeDraft, sources });
  } catch (error) {
    console.error("profile_research_failed", error);
    return NextResponse.json({ error: "Meet could not prepare the profile research." }, { status: 500 });
  }
}
