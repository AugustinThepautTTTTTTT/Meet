import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getAccountId } from "@/lib/auth";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const accountId = await getAccountId();
  if (!accountId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const purpose = String(form.get("purpose") || "media").replace(
      /[^a-z-]/g,
      "",
    );
    if (!(file instanceof File) || !allowed.has(file.type))
      return NextResponse.json(
        { error: "Upload a JPG, PNG, WebP or GIF image." },
        { status: 400 },
      );
    if (file.size > 4 * 1024 * 1024)
      return NextResponse.json(
        { error: "Images must be smaller than 4 MB." },
        { status: 400 },
      );
    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "jpg";
    const blob = await put(
      `lawyers/${accountId}/${purpose}-${crypto.randomUUID()}.${extension}`,
      file,
      { access: "public", addRandomSuffix: false },
    );
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("media_upload_failed", error);
    return NextResponse.json(
      { error: "The image could not be uploaded." },
      { status: 500 },
    );
  }
}
