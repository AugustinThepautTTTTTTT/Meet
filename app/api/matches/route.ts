import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getLawyerDb } from "@/lib/database";
import type { CaseBrief } from "@/lib/case-brief";

export const runtime = "nodejs";

const rankingSchema = z.object({
  rankings: z
    .array(
      z.object({
        slug: z.string(),
        score: z.number().int().min(0).max(100),
        reasons: z.array(z.string()).min(2).max(4),
      }),
    )
    .max(3),
});

function safe(value: unknown, max = 300) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

const retrievalStopWords = new Set([
  "about",
  "after",
  "before",
  "client",
  "their",
  "there",
  "which",
  "would",
  "could",
  "should",
  "matter",
  "needs",
  "wants",
  "advice",
  "known",
  "video",
  "standard",
  "english",
  "without",
  "terms",
  "avec", "pour", "dans", "cette", "comme", "droit", "avocat", "client", "affaire", "demande", "souhaite", "entre", "après", "avant",
]);

function retrievalTerms(brief: CaseBrief) {
  return Array.from(
    new Set(
      `${brief.dispute || ""} ${brief.summary} ${(brief.keyFacts || []).join(" ")} ${brief.jurisdiction}`
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((term) => term.length > 4 && !retrievalStopWords.has(term)),
    ),
  ).slice(0, 24);
}

function profileMatchesTerm(profileText: string, term: string) {
  if (profileText.includes(term)) return true;
  const stem = term.slice(0, Math.min(7, term.length));
  if (stem.length < 6) return false;
  return profileText
    .split(/[^\p{L}\p{N}]+/u)
    .some((profileTerm) => profileTerm.startsWith(stem));
}

const jurisdictionCoverage: Record<string, string> = {
  Paris: "France français Paris barreau de Paris tribunal judiciaire de Paris cour d'appel de Paris",
  Lyon: "France français Lyon barreau de Lyon tribunal judiciaire de Lyon cour d'appel de Lyon",
  Marseille: "France français Marseille barreau de Marseille tribunal judiciaire de Marseille cour d'appel d'Aix-en-Provence",
  Bordeaux: "France français Bordeaux barreau de Bordeaux tribunal judiciaire de Bordeaux cour d'appel de Bordeaux",
  Lille: "France français Lille barreau de Lille tribunal judiciaire de Lille cour d'appel de Douai",
  Toulouse: "France français Toulouse barreau de Toulouse tribunal judiciaire de Toulouse cour d'appel de Toulouse",
  Nantes: "France français Nantes barreau de Nantes tribunal judiciaire de Nantes cour d'appel de Rennes",
  Brussels: "Belgium Belgian Brussels",
  Berlin: "Germany German Berlin",
  Madrid: "Spain Spanish Madrid",
  London: "United Kingdom UK England Wales English London",
  Amsterdam: "Netherlands Dutch Amsterdam",
  Stockholm: "Sweden Swedish Stockholm",
};

function jurisdictionNote(
  candidate: { location: string; credentials: string },
  jurisdiction: string,
) {
  const wanted = safe(jurisdiction).toLowerCase();
  if (!wanted || /not confirmed|unknown/.test(wanted))
    return "La juridiction compétente reste à confirmer";
  const coverage =
    `${candidate.location} ${candidate.credentials} ${jurisdictionCoverage[candidate.location] || ""}`.toLowerCase();
  const terms = wanted.split(/[^a-z]+/).filter((term) => term.length > 3);
  return terms.some((term) => coverage.includes(term))
    ? "La juridiction paraît cohérente avec les qualifications indiquées sur le profil"
    : "La capacité de représentation ou de postulation devant cette juridiction doit être confirmée";
}

export async function POST(request: Request) {
  try {
    const { brief, locale = "fr" } = (await request.json()) as { brief: CaseBrief; locale?: "fr" | "en" };
    if (!brief?.summary)
      return NextResponse.json(
        { error: "A completed brief is required." },
        { status: 400 },
      );

    const sql = getLawyerDb();
    const rows = await sql`
      WITH preferred_lawyers AS (
        SELECT l.*, ROW_NUMBER() OVER (
          PARTITION BY lower(name)
          ORDER BY (account_id IS NOT NULL) DESC, created_at DESC
        ) AS profile_priority
        FROM lawyers l
        WHERE published=true
      )
      SELECT slug, name, specialty, practice, location, languages, availability,
        credentials, tags, reasons, services, bio, experience, price
      FROM preferred_lawyers
      WHERE profile_priority=1
      ORDER BY featured_rank ASC, created_at ASC
      LIMIT 30
    `;
    if (!rows.length)
      return NextResponse.json(
        { error: "No published lawyers are available." },
        { status: 404 },
      );

    const terms = retrievalTerms(brief);
    const candidates = rows
      .map((row) => {
        const profileText =
          `${row.name} ${row.practice} ${row.specialty} ${row.location} ${row.credentials} ${(row.tags || []).join(" ")} ${(row.services || []).join(" ")} ${(row.reasons || []).join(" ")} ${row.bio}`.toLowerCase();
        const matchedTerms = terms.filter((term) =>
          profileMatchesTerm(profileText, term),
        );
        const jurisdictionInProfile =
          safe(brief.jurisdiction).length > 3 &&
          profileText.includes(safe(brief.jurisdiction).toLowerCase());
        const contractIssue = terms.some((term) => term.startsWith("contract"));
        const contractExpertise = /contract/.test(profileText);
        const retrievalScore =
          (row.practice === brief.practice ? 20 : 0) +
          Math.min(32, matchedTerms.length * 8) +
          (jurisdictionInProfile ? 30 : 0) +
          (contractIssue && contractExpertise ? 15 : 0);
        return {
          slug: row.slug,
          name: row.name,
          practice: row.practice,
          specialty: safe(row.specialty, 100),
          location: safe(row.location, 80),
          credentials: safe(row.credentials, 120),
          languages: safe(row.languages, 100),
          availability: safe(row.availability, 80),
          experience: safe(row.experience, 50),
          tags: Array.isArray(row.tags) ? row.tags.slice(0, 6) : [],
          services: Array.isArray(row.services) ? row.services.slice(0, 6) : [],
          approach: Array.isArray(row.reasons) ? row.reasons.slice(0, 3) : [],
          bio: safe(row.bio, 220),
          matchedTerms: matchedTerms.slice(0, 6),
          retrievalScore,
          jurisdictionInProfile,
        };
      })
      .sort((a, b) => b.retrievalScore - a.retrievalScore);

    const deterministic = candidates
      .map((candidate) => ({
        slug: candidate.slug,
        score:
          (candidate.practice === brief.practice ? 50 : 0) +
          (safe(brief.jurisdiction).toLowerCase() &&
          `${candidate.location} ${candidate.credentials}`
            .toLowerCase()
            .includes(safe(brief.jurisdiction).toLowerCase())
            ? 25
            : 0),
      }))
      .sort((a, b) => b.score - a.score);

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({
        rankings: deterministic.slice(0, 3).map((item, index) => ({
          ...item,
          score: Math.max(70, 92 - index * 4),
          reasons: [
            "Domaine de pratique pertinent",
            "Profil publié et disponible",
          ],
          jurisdictionNote: jurisdictionNote(
            candidates.find((candidate) => candidate.slug === item.slug)!,
            brief.jurisdiction,
          ),
        })),
        source: "fallback",
      });
    }

    const { output, usage } = await generateText({
      model: google("gemini-3.5-flash"),
      output: Output.object({ schema: rankingSchema }),
      maxOutputTokens: 420,
      temperature: 0.1,
      system: `Classe les meilleurs avocats pour cette demande juridique. ${locale === "fr" ? "Rédige toutes les raisons en français." : "Write every reason in English."} Utilise uniquement les profils fournis et renvoie au maximum trois slugs uniques. Évalue d'abord le domaine juridique français précis et l'expérience factuellement démontrée, puis l'ordre de juridiction, la procédure ou juridiction probable, la langue, les échéances et la disponibilité. Pour une affaire française, distingue conseil/plaidoirie et postulation territoriale : le choix de l'avocat est en principe libre, mais certains actes de représentation sont géographiquement limités au ressort de la cour d'appel et certaines procédures ont des règles particulières. Ne déduis jamais l'inscription à un barreau de la seule ville du cabinet ; utilise uniquement les credentials vérifiés et signale toute vérification nécessaire. Ne surpondère donc pas la proximité si aucune postulation n'est pertinente. retrievalScore et matchedTerms sont des indices ancrés dans les profils. N'invente aucune expérience, certification, spécialisation ni droit de postuler. Les scores expriment une confiance de mise en relation, jamais une prédiction juridique.`,
      prompt: `CASE\n${JSON.stringify({
        dispute: brief.dispute || brief.summary,
        summary: brief.summary,
        facts: brief.keyFacts || [],
        practice: brief.practice,
        legalDomain: brief.legalDomain,
        courtOrProcedure: brief.courtOrProcedure,
        territorialBar: brief.territorialBar,
        applicableLaw: brief.applicableLaw,
        jurisdiction: brief.jurisdiction,
        urgency: brief.urgency,
        deadline: brief.deadline,
        outcome: brief.desiredOutcome,
        language: brief.language,
        meetingFormat: brief.meetingFormat,
      })}\nLAWYERS\n${JSON.stringify(candidates)}`,
    });

    const validSlugs = new Set(candidates.map((candidate) => candidate.slug));
    const seen = new Set<string>();
    const groundedReasons = (candidate: (typeof candidates)[number]) => [
      candidate.tags.length
        ? `${candidate.specialty} ; domaines indiqués : ${candidate.tags.slice(0, 3).join(", ")}`
        : `${candidate.specialty}, avec ${candidate.experience} d’expérience indiquée`,
      `Éléments concordants du profil : ${candidate.matchedTerms.slice(0, 3).join(", ")}`,
      candidate.jurisdictionInProfile
        ? `Le profil mentionne spécifiquement ${brief.jurisdiction}`
        : `Disponibilité : ${candidate.availability}`,
    ];
    const aiRankings = output.rankings
      .filter((item) => {
        const candidate = candidates.find((entry) => entry.slug === item.slug);
        if (
          !validSlugs.has(item.slug) ||
          seen.has(item.slug) ||
          !candidate ||
          item.score < 60 ||
          candidate.retrievalScore < 24
        )
          return false;
        seen.add(item.slug);
        return true;
      })
      .map((item) => {
        const candidate = candidates.find((entry) => entry.slug === item.slug)!;
        return {
          ...item,
          score: Math.max(
            item.score,
            Math.min(94, Math.round(60 + candidate.retrievalScore / 2)),
          ),
          reasons: groundedReasons(candidate),
          jurisdictionNote: jurisdictionNote(candidate, brief.jurisdiction),
        };
      });
    const rankings = [...aiRankings];
    for (const candidate of candidates) {
      if (rankings.length >= 3 || candidate.retrievalScore < 32) break;
      if (rankings.some((item) => item.slug === candidate.slug)) continue;
      rankings.push({
        slug: candidate.slug,
        score: Math.min(94, Math.round(60 + candidate.retrievalScore / 2)),
        reasons: groundedReasons(candidate),
        jurisdictionNote: jurisdictionNote(candidate, brief.jurisdiction),
      });
    }
    rankings.sort((a, b) => b.score - a.score);
    return NextResponse.json({
      rankings,
      source: "gemini",
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      },
    });
  } catch (error) {
    console.error("lawyer_matching_failed", error);
    return NextResponse.json(
      { error: "Meet could not rank lawyers right now." },
      { status: 500 },
    );
  }
}
