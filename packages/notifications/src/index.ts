export type WhatsAppEvent =
  | "enrollment.created"
  | "enrollment.expiring"
  | "enrollment.expired"
  | "enrollment.reactivated"
  | "certificate.issued"
  | "live.reminder"
  | "assessment.deadline";

export type SendWhatsAppParams = {
  /** Phone in E.164 without '+', e.g. "5511999999999" */
  phone: string;
  /** Already-rendered message text (caller resolves template) */
  text: string;
};

/**
 * Sends a WhatsApp message via Digisac API.
 * Silently skips (logs warning) when DIGISAC_TOKEN / DIGISAC_SUBDOMAIN are not set,
 * so the caller never needs to guard against missing credentials in dev/test.
 */
export async function sendWhatsApp(params: SendWhatsAppParams): Promise<void> {
  const token = process.env.DIGISAC_TOKEN;
  const subdomain = process.env.DIGISAC_SUBDOMAIN;

  if (!token || !subdomain) {
    console.warn("[notifications.sendWhatsApp] DIGISAC_TOKEN or DIGISAC_SUBDOMAIN not set — skipping");
    return;
  }

  const url = `https://${subdomain}.digisac.com.br/api/v1/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: params.phone,
        text: params.text,
        channel: "whatsapp",
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      console.error(`[notifications.sendWhatsApp] Digisac returned ${res.status}: ${body}`);
    }
  } catch (err) {
    console.error(`[notifications.sendWhatsApp] Request failed: ${err}`);
  }
}
