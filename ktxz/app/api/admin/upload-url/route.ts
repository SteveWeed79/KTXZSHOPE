import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { generateUploadUrl } from "@/lib/s3";

/**
 * GET /api/admin/upload-url?type=image/jpeg&size=204800
 *
 * Returns a short-lived S3 presigned PUT URL and the permanent public URL
 * where the object will be accessible after upload.
 *
 * The browser uploads the file directly to S3 (no data passes through the
 * Next.js server), then saves the publicUrl as the card's image field.
 */
export async function GET(req: Request) {
  const adminResult = await requireAdmin(req, { limit: 20, limiter: "generous" });
  if (adminResult instanceof NextResponse) return adminResult;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "";
  const size = parseInt(searchParams.get("size") ?? "0", 10);

  if (!type || isNaN(size) || size <= 0) {
    return NextResponse.json(
      { error: "Query params 'type' (MIME) and 'size' (bytes) are required." },
      { status: 400 }
    );
  }

  try {
    const result = await generateUploadUrl(type, size);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate upload URL." },
      { status: 400 }
    );
  }
}
