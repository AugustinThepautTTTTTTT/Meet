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
      from: process.env.MEET_EMAIL_FROM || "Repere <onboarding@resend.dev>",
      to: [clientEmail],
      subject: `Your request to ${lawyerName} was received`,
      html: `<h1>Votre demande a bien été reçue</h1><p>Bonjour ${escapeHtml(clientName)},</p><p>Votre demande de rendez-vous avec ${escapeHtml(lawyerName)} pour le créneau ${escapeHtml(meetingTime)} a été transmise.</p><p><strong>Statut :</strong> en attente de validation par l’avocat.</p><h2>Votre dossier</h2><p>${escapeHtml(brief.summary)}</p><p>Vous pouvez suivre cette demande depuis votre espace client Repere.</p>`,
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
      from: process.env.MEET_EMAIL_FROM || "Repere <onboarding@resend.dev>",
      to: [clientEmail],
      subject: `${lawyerName} approved your consultation request`,
      html: `<h1>Votre demande a été acceptée</h1><p>Bonjour ${escapeHtml(clientName)},</p><p>${escapeHtml(lawyerName)} a accepté votre consultation au créneau ${escapeHtml(meetingTime)}.</p><p>Le règlement de <strong>${escapeHtml(formattedAmount)}</strong> est nécessaire pour confirmer le rendez-vous.</p><p><a href="${escapeHtml(checkoutUrl)}">Payer et confirmer la consultation</a></p><p>La demande, la synthèse et les documents restent disponibles dans votre espace Repere.</p>`,
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
    `Synthèse privée Repere`,
    `Practice: ${brief.practice || "Legal consultation"}`,
    `Synthèse : ${brief.summary || "Consultez votre espace Repere"}`,
    `Jurisdiction: ${brief.jurisdiction || "Not confirmed"}`,
    `Desired outcome: ${brief.desiredOutcome || "Not specified"}`,
    `Parties: ${brief.parties || "Not provided"}`,
  ].join("\n");
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Repere//Consultation juridique//FR",
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
      from: process.env.MEET_EMAIL_FROM || "Repere <onboarding@resend.dev>",
      to: [lawyerEmail, clientEmail],
      subject: summary,
      html: `<h1>Your consultation is confirmed</h1><p>${escapeHtml(
        lawyerName,
      )} and ${escapeHtml(clientName)}, this meeting has been added to your calendars.</p><h2>Private case brief</h2><p>${escapeHtml(
        brief.summary,
      )}</p><p>Ouvrez Repere pour retrouver la conversation et les notes de préparation.</p>`,
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
