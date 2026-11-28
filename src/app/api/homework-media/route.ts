import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream, existsSync } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), ".uploads", "homework");
const MEDIA_KEY_PREFIX = "hw_media_";
const MAX_CLOUD_MEDIA_BYTES = 100 * 1024 * 1024; // 100MB max via chunked DB storage
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2MB cap per response (safely under Netlify 6MB Lambda limit)

const MIME_MAP: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4v": "video/x-m4v",
  ".avi": "video/x-msvideo",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".aac": "audio/aac",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

interface StoredMediaManifest {
  fileName?: string;
  mimeType?: string;
  size?: number;
  base64?: string;
  isChunked?: boolean;
  chunkSize?: number;
  totalChunks?: number;
}

interface StoredMediaChunk {
  fileName?: string;
  index?: number;
  byteLength?: number;
  base64?: string;
}

function sanitizeFileName(rawName: string): string {
  const base = path.basename(rawName || "homework_file").replace(/[^a-zA-Z0-9._-]/g, "_");
  return base || "homework_file";
}

function getContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

function parseByteRange(
  rangeHeader: string | null,
  fileSize: number
): { start: number; end: number; isPartial: boolean; invalidRange?: boolean } {
  if (!rangeHeader) {
    if (fileSize > MAX_RESPONSE_BYTES) {
      return { start: 0, end: MAX_RESPONSE_BYTES - 1, isPartial: true };
    }
    return { start: 0, end: Math.max(0, fileSize - 1), isPartial: false };
  }

  const parts = rangeHeader.replace(/bytes=/, "").split("-");
  const start = Math.max(0, parseInt(parts[0], 10) || 0);
  if (fileSize > 0 && start >= fileSize) {
    return { start, end: fileSize - 1, isPartial: true, invalidRange: true };
  }
  const requestedEnd = parts[1]
    ? Math.min(fileSize - 1, parseInt(parts[1], 10))
    : fileSize - 1;
  const clampedEnd = Math.min(Math.max(start, requestedEnd), start + MAX_RESPONSE_BYTES - 1);
  return { start, end: clampedEnd, isPartial: true };
}

function buildBufferResponse(buffer: Buffer, contentType: string, rangeHeader: string | null) {
  const fileSize = buffer.length;
  const { start, end, isPartial, invalidRange } = parseByteRange(rangeHeader, fileSize);

  if (invalidRange) {
    return new NextResponse(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${fileSize}`,
        "Accept-Ranges": "bytes",
      },
    });
  }

  const slice = fileSize === 0 ? buffer : buffer.subarray(start, end + 1);
  if (isPartial) {
    return new NextResponse(new Uint8Array(slice), {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(slice.length),
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return new NextResponse(new Uint8Array(slice), {
    status: 200,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(slice.length),
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy tệp tải lên." },
        { status: 400 }
      );
    }

    const chunkIndexRaw = formData.get("chunkIndex");
    const totalChunksRaw = formData.get("totalChunks");
    const totalSizeRaw = formData.get("totalSize");
    const chunkSizeRaw = formData.get("chunkSize");
    const uploadFileNameRaw = formData.get("uploadFileName");
    const originalNameRaw = formData.get("originalName");
    const mimeTypeRaw = formData.get("mimeType");

    const isChunkedRequest = chunkIndexRaw !== null && totalChunksRaw !== null;
    const chunkIndex = isChunkedRequest ? Math.max(0, parseInt(String(chunkIndexRaw), 10) || 0) : 0;
    const totalChunks = isChunkedRequest ? Math.max(1, parseInt(String(totalChunksRaw), 10) || 1) : 1;

    const preferredName =
      typeof uploadFileNameRaw === "string" && uploadFileNameRaw.trim()
        ? sanitizeFileName(uploadFileNameRaw.trim())
        : `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${sanitizeFileName(
            typeof originalNameRaw === "string" && originalNameRaw.trim()
              ? originalNameRaw.trim()
              : file.name
          )}`;

    const mimeType =
      (typeof mimeTypeRaw === "string" && mimeTypeRaw.trim()) ||
      file.type ||
      getContentType(preferredName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const totalSize = totalSizeRaw ? Math.max(buffer.length, parseInt(String(totalSizeRaw), 10) || 0) : buffer.length;
    const chunkSize = chunkSizeRaw ? Math.max(1, parseInt(String(chunkSizeRaw), 10) || buffer.length) : buffer.length;

    if (totalSize > MAX_CLOUD_MEDIA_BYTES) {
      return NextResponse.json(
        { success: false, error: "Dung lượng tệp vượt quá giới hạn 100MB." },
        { status: 413 }
      );
    }

    let savedToCloud = false;
    try {
      if (totalChunks <= 1) {
        await prisma.centerDataStore.upsert({
          where: { key: `${MEDIA_KEY_PREFIX}${preferredName}` },
          create: {
            key: `${MEDIA_KEY_PREFIX}${preferredName}`,
            data: {
              fileName: preferredName,
              mimeType,
              size: buffer.length,
              base64: buffer.toString("base64"),
              isChunked: false,
            },
          },
          update: {
            data: {
              fileName: preferredName,
              mimeType,
              size: buffer.length,
              base64: buffer.toString("base64"),
              isChunked: false,
            },
          },
        });
      } else {
        const chunkKey = `${MEDIA_KEY_PREFIX}${preferredName}_chunk_${chunkIndex}`;
        await prisma.centerDataStore.upsert({
          where: { key: chunkKey },
          create: {
            key: chunkKey,
            data: {
              fileName: preferredName,
              index: chunkIndex,
              byteLength: buffer.length,
              base64: buffer.toString("base64"),
            },
          },
          update: {
            data: {
              fileName: preferredName,
              index: chunkIndex,
              byteLength: buffer.length,
              base64: buffer.toString("base64"),
            },
          },
        });

        if (chunkIndex === totalChunks - 1) {
          await prisma.centerDataStore.upsert({
            where: { key: `${MEDIA_KEY_PREFIX}${preferredName}` },
            create: {
              key: `${MEDIA_KEY_PREFIX}${preferredName}`,
              data: {
                fileName: preferredName,
                mimeType,
                size: totalSize,
                isChunked: true,
                chunkSize,
                totalChunks,
              },
            },
            update: {
              data: {
                fileName: preferredName,
                mimeType,
                size: totalSize,
                isChunked: true,
                chunkSize,
                totalChunks,
              },
            },
          });
        }
      }
      savedToCloud = true;
    } catch (cloudErr) {
      console.warn("[HOMEWORK MEDIA CLOUD SAVE FALLBACK]", cloudErr);
    }

    // Best-effort local disk write (only when single upload or local dev)
    let savedToDisk = false;
    if (totalChunks <= 1) {
      try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
        await fs.writeFile(path.join(UPLOAD_DIR, preferredName), buffer);
        savedToDisk = true;
      } catch {
        // Serverless read-only fs: safely ignore
      }
    }

    if (!savedToCloud && !savedToDisk) {
      return NextResponse.json(
        { success: false, error: "Không thể lưu tệp bài tập lên Cloud DB." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fileName: preferredName,
      url: `/api/homework-media?file=${encodeURIComponent(preferredName)}`,
      mimeType,
      size: totalSize,
      chunkIndex,
      totalChunks,
      persistedCloud: savedToCloud,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi lưu tệp bài tập";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function HEAD(req: NextRequest) {
  try {
    const fileParam = req.nextUrl.searchParams.get("file");
    if (!fileParam) {
      return new NextResponse(null, { status: 400 });
    }
    const safeFile = path.basename(fileParam);
    const filePath = path.join(UPLOAD_DIR, safeFile);

    if (existsSync(filePath)) {
      const stat = await fs.stat(filePath);
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Accept-Ranges": "bytes",
          "Content-Length": String(stat.size),
          "Content-Type": getContentType(safeFile),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    const record = await prisma.centerDataStore.findUnique({
      where: { key: `${MEDIA_KEY_PREFIX}${safeFile}` },
    });
    const stored = record?.data as StoredMediaManifest | null;
    if (!stored) {
      return new NextResponse(null, { status: 404 });
    }

    const fileSize =
      typeof stored.size === "number" && stored.size > 0
        ? stored.size
        : stored.base64
        ? Buffer.byteLength(stored.base64, "base64")
        : 0;

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": String(fileSize),
        "Content-Type": stored.mimeType || getContentType(safeFile),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const fileParam = req.nextUrl.searchParams.get("file");
    const wantMeta = req.nextUrl.searchParams.get("meta") === "1";
    if (!fileParam) {
      return NextResponse.json({ success: false, error: "Thiếu tên tệp." }, { status: 400 });
    }

    const safeFile = path.basename(fileParam);
    const range = req.headers.get("range");
    const filePath = path.join(UPLOAD_DIR, safeFile);

    // 1. Đọc từ đĩa cục bộ nếu có (dev local)
    if (existsSync(filePath)) {
      const stat = await fs.stat(filePath);
      const fileSize = stat.size;
      const contentType = getContentType(safeFile);

      if (wantMeta) {
        return NextResponse.json({
          success: true,
          fileName: safeFile,
          mimeType: contentType,
          size: fileSize,
          isChunked: false,
        });
      }

      const { start, end, isPartial, invalidRange } = parseByteRange(range, fileSize);
      if (invalidRange) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}`, "Accept-Ranges": "bytes" },
        });
      }

      if (isPartial) {
        const chunkSize = end - start + 1;
        const stream = createReadStream(filePath, { start, end });
        const webStream = new ReadableStream({
          start(controller) {
            stream.on("data", (chunk) => controller.enqueue(chunk));
            stream.on("end", () => controller.close());
            stream.on("error", (err) => controller.error(err));
          },
          cancel() {
            stream.destroy();
          },
        });

        return new NextResponse(webStream, {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunkSize),
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }

      const buffer = await fs.readFile(filePath);
      return buildBufferResponse(buffer, contentType, null);
    }

    // 2. Đọc từ Cloud PostgreSQL (CenterDataStore)
    const record = await prisma.centerDataStore.findUnique({
      where: { key: `${MEDIA_KEY_PREFIX}${safeFile}` },
    });
    const stored = record?.data as StoredMediaManifest | null;
    if (!stored) {
      return NextResponse.json({ success: false, error: "Không tìm thấy tệp." }, { status: 404 });
    }

    const contentType = stored.mimeType || getContentType(safeFile);

    if (wantMeta) {
      const size =
        typeof stored.size === "number" && stored.size > 0
          ? stored.size
          : stored.base64
          ? Buffer.byteLength(stored.base64, "base64")
          : 0;
      return NextResponse.json({
        success: true,
        fileName: safeFile,
        mimeType: contentType,
        size,
        isChunked: Boolean(stored.isChunked),
        chunkSize: stored.chunkSize,
        totalChunks: stored.totalChunks,
      });
    }

    if (!stored.isChunked && stored.base64) {
      const buffer = Buffer.from(stored.base64, "base64");
      return buildBufferResponse(buffer, contentType, range);
    }

    if (stored.isChunked && stored.chunkSize && stored.size) {
      const fileSize = stored.size;
      const chunkSize = stored.chunkSize;
      const { start, end, isPartial, invalidRange } = parseByteRange(range, fileSize);

      if (invalidRange) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}`, "Accept-Ranges": "bytes" },
        });
      }

      const firstChunk = Math.floor(start / chunkSize);
      const lastChunk = Math.floor(end / chunkSize);
      const chunkKeys: string[] = [];
      for (let i = firstChunk; i <= lastChunk; i += 1) {
        chunkKeys.push(`${MEDIA_KEY_PREFIX}${safeFile}_chunk_${i}`);
      }

      const chunkRows = await prisma.centerDataStore.findMany({
        where: { key: { in: chunkKeys } },
      });
      const chunkMap = new Map<number, Buffer>();
      chunkRows.forEach((row) => {
        const c = row.data as StoredMediaChunk | null;
        if (c && typeof c.index === "number" && c.base64) {
          chunkMap.set(c.index, Buffer.from(c.base64, "base64"));
        }
      });

      const pieces: Buffer[] = [];
      for (let i = firstChunk; i <= lastChunk; i += 1) {
        const chunkBuf = chunkMap.get(i);
        if (!chunkBuf) {
          return NextResponse.json(
            { success: false, error: `Thiếu mảnh dữ liệu media (${i}).` },
            { status: 404 }
          );
        }
        const chunkGlobalStart = i * chunkSize;
        const sliceStart = Math.max(0, start - chunkGlobalStart);
        const sliceEnd = Math.min(chunkBuf.length, end - chunkGlobalStart + 1);
        if (sliceEnd > sliceStart) {
          pieces.push(chunkBuf.subarray(sliceStart, sliceEnd));
        }
      }

      const merged = Buffer.concat(pieces);
      return new NextResponse(new Uint8Array(merged), {
        status: isPartial ? 206 : 200,
        headers: {
          ...(isPartial ? { "Content-Range": `bytes ${start}-${end}/${fileSize}` } : {}),
          "Accept-Ranges": "bytes",
          "Content-Length": String(merged.length),
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    return NextResponse.json({ success: false, error: "Không tìm thấy tệp." }, { status: 404 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi đọc tệp bài tập";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
