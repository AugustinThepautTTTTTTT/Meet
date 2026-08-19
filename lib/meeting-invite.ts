import { randomUUID } from "node:crypto";

function icsDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function clean(value: unknown) {
  return String(value || "").replace(
    /[\\;,\n]/g,
    (character) => `\\${character}`,
  );
}

function escapeHtml(value: unknown) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function sendRequestReceived({
  clientName,
  clientEmail,
  lawyerName,
  meetingTime,
  brief,
}: {
  clientName: string;
  clientEmail: string;
  lawyerName: string;
  meetingTime: string;
  brief: Record<string, unknown>;
}) {
  if (!process.env.RESEND_API_KEY)
    return { sent: false, reason: "Email delivery is not configured." };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MEET_EMAIL_FROM || "Meet <onboarding@resend.dev>",
      to: [clientEmail],
      subject: `Your request to ${lawyerName} was received`,
      html: `<h1>We received your request</h1><p>Hello ${escapeHtml(clientName)},</p><p>Your request to meet ${escapeHtml(lawyerName)} at ${escapeHtml(meetingTime)} has been submitted.</p><p><strong>Status:</strong> Waiting for the lawyer to review.</p><h2>Your case</h2><p>${escapeHtml(brief.summary)}</p><p>You can track this request from your private Meet client account.</p>`,
    }),
  });
  if (!response.ok)
    return {
      sent: false,
      reason: `Email provider returned ${response.status}.`,
    };
  return { sent: true };
}

export async function sendPaymentRequired({
  clientName,
  clientEmail,
  lawyerName,
  meetingTime,
  amount,
  currency,
  checkoutUrl,
}: {
  clientName: string;
  clientEmail: string;
  lawyerName: string;
  meetingTime: string;
  amount: number;
  currency: string;
  checkoutUrl: string;
}) {
  if (!process.env.RESEND_API_KEY)
    return { sent: false, reason: "Email delivery is not configured." };
  const formattedAmount = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(amount / 100);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MEET_EMAIL_FROM || "Meet <onboarding@resend.dev>",
      to: [clientEmail],
      subject: `${lawyerName} approved your consultation request`,
      html: `<h1>Your lawyer approved the request</h1><p>Hello ${escapeHtml(clientName)},</p><p>${escapeHtml(lawyerName)} approved your proposed consultation at ${escapeHtml(meetingTime)}.</p><p><strong>${escapeHtml(formattedAmount)}</strong> is now due to confirm the meeting.</p><p><a href="${escapeHtml(checkoutUrl)}">Pay securely and confirm the consultation</a></p><p>The request, brief and documents remain available in your private Meet dashboard.</p>`,
    }),
  });
  if (!response.ok)
    return { sent: false, reason: `Email provider returned ${response.status}.` };
  return { sent: true };
}

export async function sendMeetingInvite({
  uid = randomUUID(),
  start,
  durationMinutes,
  lawyerName,
  lawyerEmail,
  clientName,
  clientEmail,
  brief,
}: {
  uid?: string;
  start: Date;
  durationMinutes: number;
  lawyerName: string;
  lawyerEmail: string;
  clientName: string;
  clientEmail: string;
  brief: Record<string, unknown>;
}) {
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const summary = `Legal consultation · ${clientName} and ${lawyerName}`;
  const notes = [
    `Private Meet case brief`,
    `Practice: ${brief.practice || "Legal consultation"}`,
    `Summary: ${brief.summary || "See the Meet dashboard"}`,
    `Jurisdiction: ${brief.jurisdiction || "Not confirmed"}`,
    `Desired outcome: ${brief.desiredOutcome || "Not specified"}`,
    `Parties: ${brief.parties || "Not provided"}`,
  ].join("\n");
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Meet//Legal consultation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}@meet.legal`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${clean(summary)}`,
    `DESCRIPTION:${clean(notes)}`,
    `ORGANIZER;CN=${clean(lawyerName)}:mailto:${lawyerEmail}`,
    `ATTENDEE;CN=${clean(lawyerName)};RSVP=TRUE:mailto:${lawyerEmail}`,
    `ATTENDEE;CN=${clean(clientName)};RSVP=TRUE:mailto:${clientEmail}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  if (!process.env.RESEND_API_KEY)
    return { uid, sent: false, reason: "Email delivery is not configured." };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `meeting-invite-${uid}`,
    },
    body: JSON.stringify({
      from: process.env.MEET_EMAIL_FROM || "Meet <onboarding@resend.dev>",
      to: [lawyerEmail, clientEmail],
      subject: summary,
      html: `<h1>Your consultation is confirmed</h1><p>${escapeHtml(
        lawyerName,
      )} and ${escapeHtml(clientName)}, this meeting has been added to your calendars.</p><h2>Private case brief</h2><p>${escapeHtml(
        brief.summary,
      )}</p><p>Open Meet for the complete conversation and preparation notes.</p>`,
      attachments: [
        {
          filename: "meet-consultation.ics",
          content: Buffer.from(calendar).toString("base64"),
          content_type: "text/calendar; method=REQUEST; charset=UTF-8",
        },
      ],
    }),
  });
  if (!response.ok)
    return {
      uid,
      sent: false,
      reason: `Email provider returned ${response.status}.`,
    };
  return { uid, sent: true };
}
