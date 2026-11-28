// Helper lưu và đọc tệp media (Video/Audio/Ảnh) vào IndexedDB & Cloud (/api/homework-media)

const DB_NAME = "ms_dung_shiny_media_db";
const STORE_NAME = "homework_media";
const DB_VERSION = 1;
const UPLOAD_CHUNK_BYTES = Math.floor(1.5 * 1024 * 1024); // 1.5MB/chunk (an toàn giới hạn 6MB Netlify Lambda)
const DOWNLOAD_CHUNK_BYTES = Math.floor(1.5 * 1024 * 1024);

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  });
}

/** Lưu Blob/File vào IndexedDB theo khóa duy nhất. */
export async function saveMediaBlob(key: string, file: Blob): Promise<void> {
  const db = await openMediaDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(file, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error("Failed to store media"));
    });
  } finally {
    db.close();
  }
}

/** Đọc Blob gốc từ IndexedDB theo khóa. */
export async function getMediaBlob(key: string): Promise<Blob | null> {
  if (!key) return null;
  try {
    const db = await openMediaDb();
    try {
      const blob = await new Promise<Blob | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result as Blob | undefined);
        req.onerror = () => reject(req.error || new Error("Failed to read media"));
      });
      return blob instanceof Blob ? blob : null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

/** Tạo Object URL phát trực tiếp (video/audio/img) từ Blob đã lưu trong IndexedDB. */
export async function getMediaBlobUrl(key: string): Promise<string | null> {
  const blob = await getMediaBlob(key);
  return blob ? URL.createObjectURL(blob) : null;
}

/** Chuyển tệp nhỏ (<= 450KB) sang Data URL để hỗ trợ đồng bộ nhẹ. */
export function fileToSmallDataUrl(file: Blob, maxBytes = 450 * 1024): Promise<string | undefined> {
  if (file.size > maxBytes || typeof FileReader === "undefined") {
    return Promise.resolve(undefined);
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : undefined);
    };
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

/**
 * Tải tệp media (Video/Audio/Ảnh/PDF) lên Cloud DB theo từng mảnh 1.5MB
 * để hoạt động ổn định trên Netlify Serverless (vượt giới hạn 6MB/request).
 */
export async function uploadHomeworkMediaToCloud(
  file: Blob,
  originalName: string,
  mimeType?: string,
  onProgress?: (percent: number) => void
): Promise<string | undefined> {
  const totalSize = file.size;
  if (totalSize === 0) return undefined;

  const totalChunks = Math.max(1, Math.ceil(totalSize / UPLOAD_CHUNK_BYTES));
  let serverFileName = "";
  let finalUrl: string | undefined;

  for (let i = 0; i < totalChunks; i += 1) {
    const start = i * UPLOAD_CHUNK_BYTES;
    const end = Math.min(totalSize, start + UPLOAD_CHUNK_BYTES);
    const chunkBlob = file.slice(start, end, mimeType || file.type || "application/octet-stream");

    let uploadedChunk = false;
    for (let attempt = 0; attempt < 2 && !uploadedChunk; attempt += 1) {
      try {
        const fd = new FormData();
        fd.append("file", chunkBlob, originalName || "homework_media");
        fd.append("chunkIndex", String(i));
        fd.append("totalChunks", String(totalChunks));
        fd.append("totalSize", String(totalSize));
        fd.append("chunkSize", String(UPLOAD_CHUNK_BYTES));
        fd.append("originalName", originalName || "homework_media");
        if (mimeType || file.type) {
          fd.append("mimeType", mimeType || file.type);
        }
        if (serverFileName) {
          fd.append("uploadFileName", serverFileName);
        }

        const res = await fetch("/api/homework-media", { method: "POST", body: fd });
        if (res.ok) {
          const json = await res.json();
          if (json?.success && json?.fileName) {
            serverFileName = json.fileName;
            finalUrl = json.url;
            uploadedChunk = true;
          }
        }
      } catch (err) {
        if (attempt === 1) {
          console.warn(`Lỗi tải mảnh ${i + 1}/${totalChunks} lên Cloud:`, err);
        }
      }
    }

    if (!uploadedChunk) {
      return undefined;
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
  }

  return finalUrl;
}

function triggerAnchorDownload(href: string, fileName: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName || "homework_media";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Tải xuống tệp media an toàn (tự ghép byte ranges nếu tệp > 2MB trên Netlify).
 */
export async function downloadHomeworkMedia(
  url: string,
  fileName: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  if (!url) return;
  if (url.startsWith("blob:") || url.startsWith("data:") || !url.includes("/api/homework-media")) {
    triggerAnchorDownload(url, fileName);
    return;
  }

  try {
    const metaSeparator = url.includes("?") ? "&" : "?";
    const metaRes = await fetch(`${url}${metaSeparator}meta=1`);
    if (!metaRes.ok) {
      triggerAnchorDownload(url, fileName);
      return;
    }
    const meta = await metaRes.json();
    const totalSize = Number(meta?.size) || 0;
    const mimeType = meta?.mimeType || "application/octet-stream";

    if (totalSize === 0 || totalSize <= DOWNLOAD_CHUNK_BYTES) {
      triggerAnchorDownload(url, fileName);
      return;
    }

    const chunks: ArrayBuffer[] = [];
    let offset = 0;
    while (offset < totalSize) {
      const end = Math.min(totalSize - 1, offset + DOWNLOAD_CHUNK_BYTES - 1);
      const res = await fetch(url, {
        headers: { Range: `bytes=${offset}-${end}` },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      chunks.push(await res.arrayBuffer());
      offset = end + 1;
      if (onProgress) {
        onProgress(Math.min(100, Math.round((offset / totalSize) * 100)));
      }
    }

    const blob = new Blob(chunks, { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);
    triggerAnchorDownload(objectUrl, fileName);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
  } catch (err) {
    console.warn("Fallback direct download:", err);
    triggerAnchorDownload(url, fileName);
  }
}
