import fs from "fs";
import path from "path";
import zlib from "zlib";

// CRC32 table for PNG chunk checksum
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  const body = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crcBuf]);
}

function generatePng(size: number): Buffer {
  const width = size;
  const height = size;

  // Raw RGBA scanlines (height * (1 + width * 4))
  const rawData = Buffer.alloc(height * (1 + width * 4));

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.46; // Rounded icon container

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData[rowOffset] = 0; // Filter byte 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Distance from center
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded squircle / rounded rect factor
      const cornerR = width * 0.22;
      const qx = Math.max(0, Math.abs(dx) - (cx - cornerR - width * 0.04));
      const qy = Math.max(0, Math.abs(dy) - (cy - cornerR - width * 0.04));
      const boxDist = Math.sqrt(qx * qx + qy * qy);

      // Background badge: Rounded rectangle
      if (boxDist <= cornerR) {
        // Gradient from warm amber-500 (#f59e0b) to deep amber-600 (#d97706)
        const t = (x + y) / (width + height);
        let r = Math.round(245 - t * 28);
        let g = Math.round(158 - t * 39);
        let b = Math.round(11 - t * 5);
        let a = 255;

        // Inside content: Shiny Star & "S"
        // 4-pointed sparkle star in the center
        const starDist = Math.sqrt(dx * dx + dy * dy);
        const starAngle = Math.atan2(dy, dx);
        // Star sparkle formula: |cos(2*theta)| or astroid shape
        const astroid = Math.pow(Math.abs(dx / (width * 0.32)), 0.6) + Math.pow(Math.abs(dy / (width * 0.32)), 0.6);

        if (astroid <= 1.0) {
          // White star sparkle with smooth glowing center
          const glow = Math.max(0, 1.0 - astroid);
          r = Math.round(r + (255 - r) * Math.min(1, glow * 2.5));
          g = Math.round(g + (255 - g) * Math.min(1, glow * 2.5));
          b = Math.round(b + (255 - b) * Math.min(1, glow * 2.5));
        }

        // Mini corner sparkle (top right)
        const s2x = x - (cx + width * 0.22);
        const s2y = y - (cy - height * 0.22);
        const a2 = Math.pow(Math.abs(s2x / (width * 0.1)), 0.6) + Math.pow(Math.abs(s2y / (width * 0.1)), 0.6);
        if (a2 <= 1.0) {
          r = 255;
          g = 255;
          b = 255;
        }

        rawData[pixelOffset] = r;
        rawData[pixelOffset + 1] = g;
        rawData[pixelOffset + 2] = b;
        rawData[pixelOffset + 3] = a;
      } else {
        // Transparent outside
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk("IHDR", ihdrData);

  // IDAT
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk("IDAT", compressed);

  // IEND
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicIconsDir = path.join(process.cwd(), "public", "icons");
if (!fs.existsSync(publicIconsDir)) {
  fs.mkdirSync(publicIconsDir, { recursive: true });
}

console.log("Đang tạo icons PWA chất lượng cao...");
const sizes = [192, 512, 180];
for (const size of sizes) {
  const buf = generatePng(size);
  const filename = size === 180 ? "apple-touch-icon.png" : `icon-${size}x${size}.png`;
  const filePath = path.join(publicIconsDir, filename);
  fs.writeFileSync(filePath, buf);
  console.log(`Đã tạo: ${filePath} (${buf.length} bytes)`);
}

// Tạo cả icon SVG vector
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect x="24" y="24" width="464" height="464" rx="100" fill="url(#amberGrad)" />
  <!-- Sparkle Center -->
  <path d="M256 96 Q256 256 96 256 Q256 256 256 416 Q256 256 416 256 Q256 256 256 96 Z" fill="#ffffff" filter="url(#glow)" />
  <circle cx="256" cy="256" r="32" fill="#ffffff" />
  <!-- Mini Sparkle Top Right -->
  <path d="M380 90 Q380 140 330 140 Q380 140 380 190 Q380 140 430 140 Q380 140 380 90 Z" fill="#ffffff" opacity="0.9" />
  <!-- Text Label -->
  <text x="256" y="465" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="800" text-anchor="middle" fill="#ffffff" letter-spacing="1">MS. DUNG SHINY</text>
</svg>`;

fs.writeFileSync(path.join(publicIconsDir, "icon.svg"), svgContent.trim());
console.log("Đã tạo icon.svg vector.");
