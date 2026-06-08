import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getR2Client() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY;
  const secretKey = process.env.CLOUDFLARE_R2_SECRET_KEY;

  if (!accountId || !accessKey || !secretKey) {
    throw new Error("Cloudflare R2 não configurado. Verifique CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY e CLOUDFLARE_R2_SECRET_KEY.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });
}

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET ?? "nexora-edu";
// Presigned URLs para download expiram em 15 minutos (requisito de segurança)
const DOWNLOAD_EXPIRES = 15 * 60;
// Upload URLs expiram em 5 minutos
const UPLOAD_EXPIRES = 5 * 60;

/**
 * Gera uma presigned URL para DOWNLOAD de um arquivo (PDF, etc).
 * Nunca expor fileKey diretamente ao client — sempre resolver server-side.
 */
export async function getPresignedDownloadUrl(fileKey: string): Promise<string> {
  const client = getR2Client();
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: fileKey });
  return getSignedUrl(client, command, { expiresIn: DOWNLOAD_EXPIRES });
}

/**
 * Faz upload de um buffer diretamente para o R2 (server-side).
 */
export async function uploadToR2(
  fileKey: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: fileKey, Body: body, ContentType: contentType }),
  );
}

/**
 * Gera uma presigned URL para UPLOAD pelo browser.
 * O client recebe a URL e faz PUT diretamente no R2, sem passar pelo servidor.
 */
export async function getPresignedUploadUrl(
  fileKey: string,
  contentType: string,
): Promise<string> {
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: UPLOAD_EXPIRES });
}

/**
 * Resolve o videoId do YouTube a partir de um videoRef interno.
 * videoRef é armazenado no banco — o ID real do YouTube nunca é exposto ao client.
 * Em produção, fazer lookup numa tabela de mapeamento ou variável de ambiente.
 */
export function resolveVideoId(videoRef: string): string {
  // TODO(fase-1): implementar lookup de videoRef → videoId real
  // Enquanto isso, assume que videoRef já é o youtubeId (somente em dev)
  return videoRef;
}

/**
 * Deriva a fileKey de upload a partir do tenantId e do nome do arquivo.
 * Formato: {tenantId}/{categoria}/{uuid}.{ext}
 */
export function buildFileKey(
  tenantId: string,
  category: "pdfs" | "imagens" | "certificados" | "imports",
  fileName: string,
): string {
  const ext = fileName.split(".").pop() ?? "bin";
  const id = crypto.randomUUID();
  return `${tenantId}/${category}/${id}.${ext}`;
}
