import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getLawyerDb } from "@/lib/database";
import { authorizeMatter, recordMatterEvent } from "@/lib/matter";

const allowedTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "text/plain",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await authorizeMatter(id);
  if (!actor)
    return NextResponse.json({ error: "Matter not found." }, { status: 404 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !allowedTypes.has(file.type))
    return NextResponse.json(
      { error: "Upload a PDF, DOCX, JPG, PNG or TXT file." },
      { status: 400 },
    );
  if (file.size <= 0 || file.size > 10 * 1024 * 1024)
    return NextResponse.json(
      { error: "Files must be smaller than 10 MB." },
      { status: 400 },
    );
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100);
  const blob = await put(
    `matters/${id}/${crypto.randomUUID()}-${safeName}`,
    file,
    { access: "private", addRandomSuffix: false, contentType: file.type },
  );
  const sql = getLawyerDb();
  const [stored] = await sql`
    INSERT INTO matter_files (inquiry_id,uploader_role,uploader_name,filename,blob_url,mime_type,size_bytes)
    VALUES (${id},${actor.role},${actor.name},${file.name},${blob.url},${file.type},${file.size})
    RETURNING id,uploader_role,uploader_name,filename,mime_type,size_bytes,created_at
  `;
  await recordMatterEvent(id, actor.role, actor.name, "file", `Shared ${file.name}`);
  return NextResponse.json({ file: stored }, { status: 201 });
}
