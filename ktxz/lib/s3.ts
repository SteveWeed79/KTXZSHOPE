import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const URL_EXPIRY_S = 300; // presigned URL valid for 5 min

// Singleton client — re-used across warm Lambda invocations.
let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _client;
}

export async function generateUploadUrl(
  mimeType: string,
  fileSizeBytes: number
): Promise<{ uploadUrl: string; publicUrl: string }> {
  if (!ALLOWED_TYPES.has(mimeType)) {
    throw new Error("Unsupported file type. Allowed: jpeg, png, webp, gif.");
  }
  if (fileSizeBytes > MAX_SIZE_BYTES) {
    throw new Error("File too large. Maximum size is 5 MB.");
  }

  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error("AWS_S3_BUCKET is not configured.");

  const ext = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
  const key = `cards/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: mimeType,
    ContentLength: fileSizeBytes,
  });

  const uploadUrl = await getSignedUrl(getClient(), command, {
    expiresIn: URL_EXPIRY_S,
  });

  // Prefer CloudFront domain if configured; fall back to direct S3 path-style URL.
  const cdnDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  const publicUrl = cdnDomain
    ? `https://${cdnDomain}/${key}`
    : `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return { uploadUrl, publicUrl };
}
