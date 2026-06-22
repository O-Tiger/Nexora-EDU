import { NextRequest } from "next/server";
import { getTenantConfig } from "@nexora/db/src/queries/administracao";
import { getPresignedDownloadUrl } from "@/lib/r2";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const config = await getTenantConfig(tenantId);
  if (!config?.logoUrl) return new Response(null, { status: 404 });

  // logoUrl in DB is the serving route (/api/logo/tenantId).
  // The actual R2 key is derived deterministically.
  // Try each supported extension in order.
  const exts = ["png", "jpg", "webp"];
  for (const ext of exts) {
    const key = `${tenantId}/logos/logo.${ext}`;
    try {
      const signedUrl = await getPresignedDownloadUrl(key, 3600);
      const r2Res = await fetch(signedUrl);
      if (!r2Res.ok) continue;
      const body = await r2Res.arrayBuffer();
      const ct = r2Res.headers.get("content-type") ?? "image/png";
      return new Response(body, {
        headers: {
          "Content-Type": ct,
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    } catch {
      continue;
    }
  }
  return new Response(null, { status: 404 });
}
