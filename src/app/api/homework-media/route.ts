import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream, existsSync } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), ".uploads", "homework");
const MEDIA_KEY_PREFIX = "hw_media_";
const MAX_CLOUD_MEDIA_BYTES = 15 * 1024 * 1024; // 15MB max persistent DB store per file

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

function sanitizeFileName(rawName: string): string {
  const base = path.basename(rawName || "homework_file").replace(/[^a-zA-Z0-9._-]/g, "_");
  return base || "homework_file";
}

function getContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

function buildBufferResponse(buffer: Buffer, contentType: string, rangeHeader: string | null) {
  const fileSize = buffer.length;
  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = Math.max(0, parseInt(parts[0], 10) || 0);
    const end = parts[1] ? Math.min(fileSize - 1, parseInt(parts[1], 10)) : fileSize - 1;
    const slice = buffer.subarray(start, end + 1);
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

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(fileSize),
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

    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${sanitizeFileName(file.name)}`;
    const mimeType = file.type || getContentType(safeName);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let savedToCloud = false;
    if (buffer.length <= MAX_CLOUD_MEDIA_BYTES) {
      try {
        await prisma.centerDataStore.upsert({
          where: { key: `${MEDIA_KEY_PREFIX}${safeName}` },
          create: {
            key: `${MEDIA_KEY_PREFIX}${safeName}`,
            data: {
              fileName: safeName,
              mimeType,
              size: buffer.length,
              base64: buffer.toString("base64"),
            },
          },
          update: {
            data: {
              fileName: safeName,
              mimeType,
              size: buffer.length,
              base64: buffer.toString("base64"),
            },
          },
        });
        savedToCloud = true;
      } catch (cloudErr) {
        console.warn("[HOMEWORK MEDIA CLOUD SAVE FALLBACK]", cloudErr);
      }
    }

    let savedToDisk = false;
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      const filePath = path.join(UPLOAD_DIR, safeName);
      await fs.writeFile(filePath, buffer);
      savedToDisk = true;
    } catch (diskErr) {
      console.warn("[HOMEWORK MEDIA DISK SAVE FALLBACK]", diskErr);
    }

    if (!savedToCloud && !savedToDisk) {
      return NextResponse.json(
        { success: false, error: "Không thể lưu tệp bài tập lên Cloud hoặc ổ đĩa." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fileName: safeName,
      url: `/api/homework-media?file=${encodeURIComponent(safeName)}`,
      mimeType,
      size: file.size,
      persistedCloud: savedToCloud,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi lưu tệp bài tập";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const fileParam = req.nextUrl.searchParams.get("file");
    if (!fileParam) {
      return NextResponse.json({ success: false, error: "Thiếu tên tệp." }, { status: 400 });
    }

    const safeFile = path.basename(fileParam);
    const range = req.headers.get("range");
    const filePath = path.join(UPLOAD_DIR, safeFile);

    // 1. Ưu tiên đọc từ đĩa cục bộ nếu có
    if (existsSync(filePath)) {
      const stat = await fs.stat(filePath);
      const fileSize = stat.size;
      const contentType = getContentType(safeFile);

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = Math.max(0, parseInt(parts[0], 10) || 0);
        const end = parts[1] ? Math.min(fileSize - 1, parseInt(parts[1], 10)) : fileSize - 1;
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

    // 2. Fallback từ Cloud PostgreSQL (CenterDataStore)
    const record = await prisma.centerDataStore.findUnique({
      where: { key: `${MEDIA_KEY_PREFIX}${safeFile}` },
    });
    const stored = record?.data as { base64?: string; mimeType?: string } | null;
    if (stored?.base64) {
      const buffer = Buffer.from(stored.base64, "base64");
      const contentType = stored.mimeType || getContentType(safeFile);
      return buildBufferResponse(buffer, contentType, range);
    }

    return NextResponse.json({ success: false, error: "Không tìm thấy tệp." }, { status: 404 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi đọc tệp bài tập";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
