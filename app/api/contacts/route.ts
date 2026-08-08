import { NextResponse } from "next/server";
import { getClientDb } from "@/lib/database";

export async function POST(request: Request) {
  try {
    const { lawyerName, clientName, email, message } = await request.json();
    if (
      !lawyerName ||
      !clientName?.trim() ||
      !email?.includes("@") ||
      !message?.trim()
    ) {
      return NextResponse.json(
        { error: "Complete your name, email and message." },
        { status: 400 },
      );
    }
    const sql = getClientDb();
    const [created] = await sql`
      INSERT INTO contact_requests (lawyer_name, client_name, email, message)
      VALUES (${lawyerName}, ${clientName.trim()}, ${email.trim().toLowerCase()}, ${message.trim()})
      RETURNING id, status, created_at
    `;
    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    console.error("contact_create_failed", error);
    return NextResponse.json(
      { error: "Your request could not be sent. Please try again." },
      { status: 500 },
    );
  }
}
