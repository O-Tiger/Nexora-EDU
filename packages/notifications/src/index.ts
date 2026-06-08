// TODO(fase-2): implementar sendWhatsApp(event, recipientId, data) via Digisac API
// Cada tipo de evento é um template configurável pelo admin no banco.
// Nunca hardcodar textos de mensagem aqui.

export type WhatsAppEvent =
  | "enrollment.created"
  | "enrollment.expiring"
  | "enrollment.expired"
  | "enrollment.reactivated"
  | "certificate.issued"
  | "live.reminder"
  | "assessment.deadline";

export type SendWhatsAppParams = {
  event: WhatsAppEvent;
  recipientPhone: string;
  tenantId: string;
  data: Record<string, string | number>;
};

export async function sendWhatsApp(_params: SendWhatsAppParams): Promise<void> {
  // TODO(fase-2): integrar Digisac API
  // POST https://{DIGISAC_SUBDOMAIN}.digisac.com.br/api/v1/messages
  // Authorization: Bearer DIGISAC_TOKEN
  throw new Error("sendWhatsApp não implementado — fase 2");
}
