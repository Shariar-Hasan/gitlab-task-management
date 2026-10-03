/**
 * Generate proper PNG icon files for the Chrome extension.
 * Creates icons at 16, 32, 48, and 128 pixel sizes using pure Node.js.
 * Uses zlib to generate valid compressed PNG data.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create a minimal valid PNG file with the GTM logo colors
// Uses a purple/violet gradient lightning bolt design
function createPNG(size) {
  // Draw pixels: purple rounded square with white "G" or lightning bolt
  const pixels = new Uint8Array(size * size * 4);
  
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.45; // radius for rounded square
  const cornerR = size * 0.15; // corner radius
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      
      // Normalized coords from center
      const nx = x - cx;
      const ny = y - cy;
      
      // Rounded rect check
      const inRect = isInRoundedRect(x, y, size * 0.05, size * 0.05, size * 0.9, size * 0.9, size * 0.18);
      
      if (inRect) {
        // Background gradient: dark purple to violet
        const t = (y / size);
        const bgR = Math.round(lerp(0x18, 0x30, t));
        const bgG = Math.round(lerp(0x08, 0x10, t));
        const bgB = Math.round(lerp(0x30, 0x50, t));
        
        pixels[idx]     = bgR;
        pixels[idx + 1] = bgG;
        pixels[idx + 2] = bgB;
        pixels[idx + 3] = 255;
        
        // Draw a simplified lightning bolt / "G" icon in bright purple/white
        // Lightning bolt: top-right to center-left to bottom-right
        const boltColor = isOnBolt(x, y, size);
        if (boltColor) {
          pixels[idx]     = 0xce;
          pixels[idx + 1] = 0x93;
          pixels[idx + 2] = 0xff;
          pixels[idx + 3] = 255;
        }
      } else {
        // Transparent
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      }
    }
  }
  
  return encodePNG(size, size, pixels);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function isInRoundedRect(px, py, rx, ry, rw, rh, cr) {
  if (px < rx || px > rx + rw || py < ry || py > ry + rh) return false;
  // Check corners
  const corners = [
    [rx + cr, ry + cr],
    [rx + rw - cr, ry + cr],
    [rx + cr, ry + rh - cr],
    [rx + rw - cr, ry + rh - cr],
  ];
  for (const [cx, cy] of corners) {
    if (px < cx - cr || px > cx + cr) continue;
    if (py < cy - cr || py > cy + cr) continue;
    const dx = px - cx;
    const dy = py - cy;
    if (dx * dx + dy * dy > cr * cr) return false;
  }
  return true;
}

function isOnBolt(x, y, size) {
  const s = size;
  const thickness = Math.max(1, s * 0.10);
  
  // Simplified lightning bolt path:
  // Top segment: from (0.65s, 0.1s) down-left to (0.45s, 0.48s)
  // Bottom segment: from (0.55s, 0.52s) down-left to (0.35s, 0.9s)
  // The bolt has a gap at center and shifts left
  
  const topX1 = s * 0.62, topY1 = s * 0.12;
  const topX2 = s * 0.38, topY2 = s * 0.50;
  const botX1 = s * 0.62, botY1 = s * 0.50;
  const botX2 = s * 0.38, botY2 = s * 0.88;
  
  return (
    distToSegment(x, y, topX1, topY1, topX2, topY2) < thickness ||
    distToSegment(x, y, botX1, botY1, botX2, botY2) < thickness
  );
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function encodePNG(width, height, pixels) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  
  // Raw pixel data with filter bytes
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // filter type: None
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * (1 + width * 4) + 1 + x * 4;
      rawData[dstIdx] = pixels[srcIdx];
      rawData[dstIdx + 1] = pixels[srcIdx + 1];
      rawData[dstIdx + 2] = pixels[srcIdx + 2];
      rawData[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }
  
  const compressed = zlib.deflateSync(rawData);
  
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeStr = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.concat([typeStr, data]);
    const crcVal = crc32(crcBuf);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crcVal >>> 0, 0);
    return Buffer.concat([len, typeStr, data, crc]);
  }
  
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate icons
const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const sizes = [16, 32, 48, 128];
for (const size of sizes) {
  const png = createPNG(size);
  const outPath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✓ Generated ${outPath} (${png.length} bytes, ${size}x${size})`);
}

console.log('\n✓ All icons generated successfully!');
