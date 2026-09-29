// Utilità per la grafica GBA: immagini a indici di tavolozza, colori a 15 bit, 4bpp, PNG di anteprima.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

export const hex = h=>{ const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const rgb15 = ([r, g, b])=>(r >> 3) | ((g >> 3) << 5) | ((b >> 3) << 10);

// immagine a indici (0 = trasparente)
export class Img {
  constructor(w, h){ this.w = w; this.h = h; this.p = new Uint8Array(w * h); }
  get(x, y){ return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.p[y * this.w + x]; }
  set(x, y, c){ if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.p[y * this.w + x] = c; }
  rect(x, y, w, h, c){ for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  // disegna una griglia di caratteri: map = { carattere: indice }
  grid(rows, map, ox=0, oy=0, flip=false){
    rows.forEach((r, y)=>[...r].forEach((ch, x)=>{ const c = map[ch]; if (c !== undefined && ch !== '.') this.set(ox + (flip ? r.length - 1 - x : x), oy + y, c); }));
    return this;
  }
  blit(src, ox, oy){ for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++){ const c = src.get(x, y); if (c) this.set(ox + x, oy + y, c); } return this; }
  clone(){ const i = new Img(this.w, this.h); i.p.set(this.p); return i; }
  // tile 8x8 in formato 4bpp GBA (due pixel per byte, il pixel di sinistra nel nibble basso)
  tile4(tx, ty){
    const out = new Uint8Array(32);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x += 2){
      const a = this.get(tx * 8 + x, ty * 8 + y) & 15, b = this.get(tx * 8 + x + 1, ty * 8 + y) & 15;
      out[y * 4 + x / 2] = a | (b << 4);
    }
    return out;
  }
}

// generatore pseudo-casuale deterministico
export function rng(seed){ let s = seed >>> 0 || 1; return ()=>((s = (s * 1103515245 + 12345) >>> 0) / 4294967296); }
export const hash2 = (x, y, k=0)=>{ let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(k + 1, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); h = Math.imul(h ^ (h >>> 16), 2246822519); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };

// PNG RGBA minimale (per le anteprime)
function crc32(buf){ let c, crc = 0xFFFFFFFF; for (let n = 0; n < buf.length; n++){ c = (crc ^ buf[n]) & 0xFF; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data){ const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
export function writePNG(path, w, h, rgba, scale=1){
  const W = w * scale, H = h * scale, raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++){ raw[y * (W * 4 + 1)] = 0; for (let x = 0; x < W; x++){ const s = ((y / scale | 0) * w + (x / scale | 0)) * 4, d = y * (W * 4 + 1) + 1 + x * 4; raw[d] = rgba[s]; raw[d + 1] = rgba[s + 1]; raw[d + 2] = rgba[s + 2]; raw[d + 3] = rgba[s + 3]; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
// foglio di anteprima: [{ img, pal:[[r,g,b]...] }] affiancati
export function previewSheet(path, items, cols=16, scale=3, bg=[40, 44, 60]){
  const cw = Math.max(...items.map(i=>i.img.w)) + 2, ch = Math.max(...items.map(i=>i.img.h)) + 2;
  const rows = Math.ceil(items.length / cols), w = cols * cw, h = rows * ch, rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++){ rgba[i * 4] = bg[0]; rgba[i * 4 + 1] = bg[1]; rgba[i * 4 + 2] = bg[2]; rgba[i * 4 + 3] = 255; }
  items.forEach((it, n)=>{
    const ox = (n % cols) * cw + 1, oy = (n / cols | 0) * ch + 1;
    for (let y = 0; y < it.img.h; y++) for (let x = 0; x < it.img.w; x++){
      const c = it.img.get(x, y); if (!c && !it.opaque) continue;
      const [r, g, b] = it.pal[c] || [255, 0, 255], d = ((oy + y) * w + ox + x) * 4;
      rgba[d] = r; rgba[d + 1] = g; rgba[d + 2] = b;
    }
  });
  writePNG(path, w, h, rgba, scale);
}
// array C
export const cArray = (type, name, data, perLine=24)=>{
  const items = [...data].map(v=>type === 'u16' ? '0x' + v.toString(16).padStart(4, '0') : String(v));
  let s = `const ${type === 'u16' ? 'u16' : type === 's16' ? 's16' : 'u8'} ${name}[${items.length}] __attribute__((aligned(4))) = {\n`;
  for (let i = 0; i < items.length; i += perLine) s += '  ' + items.slice(i, i + perLine).join(',') + ',\n';
  return s + '};\n';
};
