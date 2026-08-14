import { createHash } from "node:crypto";
import { getClientDb } from "@/lib/database";
import { ensureClientWorkflowSchema } from "@/lib/workflow-schema";

export type IntakeDocumentRef = { id: string; token: string };

export function hashDocumentToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getIntakeDocuments(refs: IntakeDocumentRef[]) {
  await ensureClientWorkflowSchema();
  const sql = getClientDb();
  const documents = [];
  for (const ref of refs.slice(0, 3)) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(ref?.id || "") ||
      !/^[0-9a-f]{64}$/i.test(ref?.token || "")
    )
      continue;
    const [document] = await sql`
      SELECT id,filename,mime_type,size_bytes,extracted_text,analysis,blob_url,case_id
      FROM intake_documents
      WHERE id=${ref.id} AND access_token_hash=${hashDocumentToken(ref.token)}
    `;
    if (document) documents.push(document);
  }
  return documents;
}

export function compactDocumentEvidence(
  documents: Array<{ filename: string; analysis: Record<string, unknown> }>,
) {
  return documents
    .map((document, index) => {
      const analysis = document.analysis || {};
      return [
        `DOCUMENT ${index + 1}: ${document.filename}`,
        `Type: ${analysis.documentType || "Document"}`,
        `Summary: ${analysis.summary || "No readable text was extracted."}`,
        `Dispute object: ${analysis.disputeObject || "Not separately extracted"}`,
        `Claims / requested relief: ${Array.isArray(analysis.claims) ? analysis.claims.join("; ") : "None separately extracted"}`,
        `Procedure / court: ${analysis.procedure || "Not separately extracted"}`,
        `Detailed document study: ${analysis.detailedAnalysis || "Not available"}`,
        `Chronology: ${Array.isArray(analysis.chronology) ? analysis.chronology.join("; ") : "None extracted"}`,
        `Apparent legal issues: ${Array.isArray(analysis.legalIssues) ? analysis.legalIssues.join("; ") : "None extracted"}`,
        `Evidence cited in the document: ${Array.isArray(analysis.citedEvidence) ? analysis.citedEvidence.join("; ") : "None extracted"}`,
        `Genuine uncertainties: ${Array.isArray(analysis.uncertainties) ? analysis.uncertainties.join("; ") : "None identified"}`,
        `Facts: ${Array.isArray(analysis.relevantFacts) ? analysis.relevantFacts.slice(0, 10).join("; ") : "None extracted"}`,
        `Dates: ${Array.isArray(analysis.dates) ? analysis.dates.slice(0, 10).join("; ") : "None extracted"}`,
        `Parties: ${Array.isArray(analysis.parties) ? analysis.parties.slice(0, 10).join("; ") : "None extracted"}`,
      ].join("\n");
    })
    .join("\n\n")
    .slice(0, 24000);
}
