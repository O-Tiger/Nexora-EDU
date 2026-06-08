import DOMPurify from "isomorphic-dompurify";

// Subconjunto seguro de HTML permitido no richText do Page Builder.
// Conteúdo é autorado por ADMIN, mas renderizado em página pública — sanitizar
// é defesa contra XSS armazenado (admin comprometido / colagem maliciosa).
const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "a",
  "ul", "ol", "li", "blockquote", "h2", "h3", "h4", "span",
];
const ALLOWED_ATTR = ["href", "target", "rel"];

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Bloqueia javascript:, data:, vbscript: em href.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#)/i,
    ADD_ATTR: ["target"],
  });
}
