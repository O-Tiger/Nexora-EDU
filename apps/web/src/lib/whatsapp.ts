import { prisma } from "@nexora/db";
import { sendWhatsApp, type WhatsAppEvent } from "@nexora/notifications";

/**
 * Resolves the WhatsApp template for a given event, renders it with `data`,
 * then dispatches via Digisac. Silently skips if no active template exists.
 */
export async function sendWhatsAppEvent(
  tenantId: string,
  event: WhatsAppEvent,
  phone: string,
  data: Record<string, string | number>,
): Promise<void> {
  if (!phone) return;

  const template = await prisma.whatsAppTemplate.findFirst({
    where: { tenantId, event, isActive: true },
    select: { bodyTemplate: true },
  });

  if (!template) {
    console.warn(`[whatsapp] No active template for event="${event}" tenantId="${tenantId}" — skipping`);
    return;
  }

  const text = renderTemplate(template.bodyTemplate, data);
  await sendWhatsApp({ phone, text });
}

function renderTemplate(template: string, data: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    key in data ? String(data[key]) : `{{${key}}}`,
  );
}
