import { NextResponse } from "next/server";
import { getClientDb } from "@/lib/database";

export async function POST(request: Request) {
  try {
    const { problem, category, detectedPractice } = await request.json();
    if (!problem?.trim()) return NextResponse.json({ error: "Describe your situation first." }, { status: 400 });
    const sql = getClientDb();
    const [created] = await sql`
      INSERT INTO cases (problem, category, detected_practice)
      VALUES (${problem.trim()}, ${category || "Not sure"}, ${detectedPractice || "Not sure"})
      RETURNING id, created_at
    `;
    return NextResponse.json({ case: created }, { status: 201 });
  } catch (error) {
    console.error("case_create_failed", error);
    return NextResponse.json({ error: "We could not save your request. Please try again." }, { status: 500 });
  }
}
