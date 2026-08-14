import { NextResponse } from "next/server";
import { getClientDb } from "@/lib/database";
import { createCaseBrief } from "@/lib/case-brief";
import { ensureClientWorkflowSchema } from "@/lib/workflow-schema";
import { getIntakeDocuments, type IntakeDocumentRef } from "@/lib/intake-documents";

export async function POST(request: Request) {
  try {
    const { problem, category, detectedPractice, brief: suppliedBrief, documentRefs } =
      await request.json();
    if (!problem?.trim())
      return NextResponse.json(
        { error: "Describe your situation first." },
        { status: 400 },
      );
    const sql = getClientDb();
    await ensureClientWorkflowSchema();
    const documents = await getIntakeDocuments(
      Array.isArray(documentRefs) ? (documentRefs as IntakeDocumentRef[]) : [],
    );
    const brief = suppliedBrief?.summary
      ? suppliedBrief
      : createCaseBrief(problem, detectedPractice || category || "Not sure");
    brief.documents = documents.map((document) => ({
      id: document.id,
      filename: document.filename,
      documentType: String(document.analysis?.documentType || "Document"),
      summary: String(document.analysis?.summary || "Attached for lawyer review"),
      relevantFacts: Array.isArray(document.analysis?.relevantFacts) ? document.analysis.relevantFacts : [],
      dates: Array.isArray(document.analysis?.dates) ? document.analysis.dates : [],
      parties: Array.isArray(document.analysis?.parties) ? document.analysis.parties : [],
    }));
    const [created] = await sql`
      INSERT INTO cases (problem, category, detected_practice, brief, status)
      VALUES (${problem.trim()}, ${category || "Not sure"}, ${detectedPractice || "Not sure"}, ${JSON.stringify(brief)}::jsonb, 'matching')
      RETURNING id, brief, status, created_at
    `;
    for (const document of documents) {
      await sql`UPDATE intake_documents SET case_id=${created.id}
        WHERE id=${document.id} AND case_id IS NULL`;
    }
    return NextResponse.json({ case: created }, { status: 201 });
  } catch (error) {
    console.error("case_create_failed", error);
    return NextResponse.json(
      { error: "We could not save your request. Please try again." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, brief } = await request.json();
    if (!id || !brief?.summary?.trim())
      return NextResponse.json(
        { error: "Review your case summary first." },
        { status: 400 },
      );
    await ensureClientWorkflowSchema();
    const sql = getClientDb();
    const [updated] = await sql`
      UPDATE cases SET brief=${JSON.stringify(brief)}::jsonb, status='matching', updated_at=now()
      WHERE id=${id}
      RETURNING id, brief, status
    `;
    if (!updated)
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    return NextResponse.json({ case: updated });
  } catch (error) {
    console.error("case_update_failed", error);
    return NextResponse.json(
      { error: "We could not update your brief." },
      { status: 500 },
    );
  }
}
