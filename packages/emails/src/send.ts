import { Resend } from "resend";
import { render } from "@react-email/render";
import type * as React from "react";

let resend: Resend | null = null;

function getResend(): Resend {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurado");
  resend = new Resend(key);
  return resend;
}

export async function sendEmail({
  to,
  subject,
  template,
}: {
  to: string;
  subject: string;
  template: React.ReactElement;
}): Promise<void> {
  const html = await render(template);
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@nexora.edu";

  const client = getResend();
  const { error } = await client.emails.send({ from, to, subject, html });

  if (error) {
    console.error("[sendEmail] Falha ao enviar email:", error);
    throw new Error(`Falha ao enviar email: ${error.message}`);
  }
}
