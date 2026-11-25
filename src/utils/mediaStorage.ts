// Helper lưu và đọc tệp media (Video/Audio/Ảnh) vào IndexedDB để tránh vượt giới hạn 5MB của LocalStorage

const DB_NAME = "ms_dung_shiny_media_db";
const STORE_NAME = "homework_media";
const DB_VERSION = 1;

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

/** Tạo Object URL phát trực tiếp (video/audio/img) từ Blob đã lưu trong IndexedDB. */
export async function getMediaBlobUrl(key: string): Promise<string | null> {
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
      if (blob instanceof Blob) {
        return URL.createObjectURL(blob);
      }
      return null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

/** Chuyển tệp nhỏ (<= 450KB) sang Data URL để hỗ trợ đồng bộ nhẹ. */
export function fileToSmallDataUrl(file: File, maxBytes = 450 * 1024): Promise<string | undefined> {
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
