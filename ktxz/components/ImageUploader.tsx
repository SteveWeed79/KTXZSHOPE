"use client";

import { useState, useRef } from "react";
import Image from "next/image";

interface ImageUploaderProps {
  /** Form field name submitted with the parent <form>. Defaults to "image". */
  name?: string;
  /** Initial image URL (from existing card data). */
  defaultValue?: string;
  /** Tailwind classes forwarded to the wrapper div. */
  className?: string;
}

/**
 * Admin-only image upload widget.
 *
 * Flow:
 *   1. Admin picks a file.
 *   2. Component fetches a presigned PUT URL from /api/admin/upload-url.
 *   3. File is PUT directly to S3 from the browser (never passes through Next.js).
 *   4. Resulting publicUrl is stored in a hidden input so the parent form
 *      can submit it like any other field.
 */
export default function ImageUploader({
  name = "image",
  defaultValue = "",
  className,
}: ImageUploaderProps) {
  const [url, setUrl] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);

    try {
      // 1. Get presigned URL from our API.
      const res = await fetch(
        `/api/admin/upload-url?type=${encodeURIComponent(file.type)}&size=${file.size}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      const { uploadUrl, publicUrl } = await res.json();

      // 2. PUT the file directly to S3 using the presigned URL.
      const s3Res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!s3Res.ok) throw new Error("S3 upload failed. Please try again.");

      setUrl(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={className}>
      {/* Hidden input carries the S3 URL into the parent form submission. */}
      <input type="hidden" name={name} value={url} />

      <label className="block cursor-pointer">
        <div
          className={`
            relative flex items-center justify-center rounded-xl border border-dashed
            border-border bg-muted/30 transition-colors hover:bg-muted/50
            ${uploading ? "opacity-60 pointer-events-none" : ""}
            ${url ? "h-36" : "h-24"}
          `}
        >
          {url ? (
            <>
              <Image
                src={url}
                alt="Card image preview"
                fill
                sizes="200px"
                className="object-contain rounded-xl p-1"
                unoptimized={url.startsWith("blob:")}
              />
              {/* Overlay hint */}
              <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 hover:opacity-100 transition-opacity text-[10px] font-mono text-white uppercase tracking-widest">
                Change
              </span>
            </>
          ) : (
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              {uploading ? "Uploading…" : "Click to upload image"}
            </span>
          )}

          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/70 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Uploading…
            </span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            // Reset so the same file can be re-selected after an error.
            e.target.value = "";
          }}
        />
      </label>

      {error && (
        <p className="mt-1 text-[10px] text-red-500 font-mono">{error}</p>
      )}
    </div>
  );
}
