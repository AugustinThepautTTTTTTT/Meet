import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getLawyerDb } from "@/lib/database";
import { authorizeMatter } from "@/lib/matter";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id, fileId } = await params;
  const actor = await authorizeMatter(id);
  if (!actor)
    return NextResponse.json({ error: "Matter not found." }, { status: 404 });
  const sql = getLawyerDb();
  const [file] = await sql`
    SELECT filename,blob_url,mime_type FROM matter_files
    WHERE id=${fileId} AND inquiry_id=${id}
  `;
  if (!file)
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  const blob = await get(file.blob_url, { access: "private" });
  if (!blob || blob.statusCode !== 200 || !blob.stream)
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  const downloadName = String(file.filename).replace(/["\r\n]/g, "");
  return new Response(blob.stream, {
    headers: {
      "Content-Type": file.mime_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${downloadName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
