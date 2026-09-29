// Ricostruisce lo schermo GBA (Mode 0) da VRAM, tavolozze, OAM e registri salvati con GDB.
import { readFileSync } from 'node:fs';
import { writePNG } from './pixel.mjs';

export function renderSnap(dir, outPng){
  const shadow = readFileSync(dir + '/shadow.bin');
  const vram = readFileSync(dir + '/vram.bin'), pal = readFileSync(dir + '/pal.bin'), oam = readFileSync(dir + '/oam.bin'), io = readFileSync(dir + '/io.bin');
  const r16 = (b, o)=>b[o] | (b[o + 1] << 8);
  const s16 = (b, o)=>{ const v = r16(b, o); return v & 0x8000 ? v - 0x10000 : v; };
  const color = i=>{ const c = r16(pal, i * 2); return [(c & 31) << 3, ((c >> 5) & 31) << 3, ((c >> 10) & 31) << 3]; };
  const dispcnt = r16(io, 0);
  const W = 240, H = 160, rgba = new Uint8Array(W * H * 4);
  const tile4 = (base, tile, x, y)=>{ const b = vram[base + tile * 32 + y * 4 + (x >> 1)]; return x & 1 ? b >> 4 : b & 15; };
  // livelli di sfondo
  const bgs = [];
  for (let n = 0; n < 4; n++){
    if (!(dispcnt & (0x100 << n))) continue;
    const cnt = r16(io, 8 + n * 2);
    bgs.push({ n, prio:cnt & 3, cb:((cnt >> 2) & 3) * 0x4000, sb:((cnt >> 8) & 31) * 0x800, size:(cnt >> 14) & 3, hofs:r16(shadow, n * 4) & 511, vofs:r16(shadow, n * 4 + 2) & 511 });
  }
  // sprite
  const objs = [];
  if (dispcnt & 0x1000) for (let i = 0; i < 128; i++){
    const a0 = r16(oam, i * 8), a1 = r16(oam, i * 8 + 2), a2 = r16(oam, i * 8 + 4);
    const aff = (a0 >> 8) & 1, dbl = (a0 >> 9) & 1;
    if (!aff && dbl) continue;                       // nascosto
    const shape = a0 >> 14, size = a1 >> 14;
    const dims = [[[8, 8], [16, 16], [32, 32], [64, 64]], [[16, 8], [32, 8], [32, 16], [64, 32]], [[8, 16], [8, 32], [16, 32], [32, 64]]][shape]?.[size];
    if (!dims) continue;
    let y = a0 & 255, x = a1 & 511; if (y >= 160) y -= 256; if (x >= 240) x -= 512;
    const o = { x, y, w:dims[0], h:dims[1], tile:a2 & 1023, prio:(a2 >> 10) & 3, pal:a2 >> 12, hflip:!aff && (a1 >> 12) & 1, aff, dbl };
    if (aff){ const g = (a1 >> 9) & 31; o.m = [s16(oam, g * 32 + 6), s16(oam, g * 32 + 14), s16(oam, g * 32 + 22), s16(oam, g * 32 + 30)]; }
    objs.push(o);
  }
  const oneD = dispcnt & 0x40;
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++){
    let best = null, bestP = 9;
    for (const bg of bgs){
      if (bg.prio >= bestP) continue;
      const wpx = bg.size & 1 ? 512 : 256, hpx = bg.size & 2 ? 512 : 256;
      const x = (px + bg.hofs) % wpx, y = (py + bg.vofs) % hpx;
      let sbo = bg.sb + ((y >> 3) & 31) * 64 + ((x >> 3) & 31) * 2;
      if (x >= 256) sbo += 0x800; if (y >= 256) sbo += bg.size === 3 ? 0x1000 : 0x800;
      const e = r16(vram, sbo), tile = e & 1023, hf = (e >> 10) & 1, vf = (e >> 11) & 1, pb = e >> 12;
      const tx = hf ? 7 - (x & 7) : x & 7, ty = vf ? 7 - (y & 7) : y & 7;
      const c = tile4(bg.cb, tile, tx, ty);
      if (c){ best = pb * 16 + c; bestP = bg.prio; }
    }
    for (const o of objs){
      if (o.prio > bestP) continue;
      const bw = o.dbl ? o.w * 2 : o.w, bh = o.dbl ? o.h * 2 : o.h;
      if (px < o.x || py < o.y || px >= o.x + bw || py >= o.y + bh) continue;
      let tx, ty;
      if (o.aff){ const cx = px - o.x - bw / 2, cy = py - o.y - bh / 2; tx = Math.floor((o.m[0] * cx + o.m[1] * cy) / 256 + o.w / 2); ty = Math.floor((o.m[2] * cx + o.m[3] * cy) / 256 + o.h / 2); if (tx < 0 || ty < 0 || tx >= o.w || ty >= o.h) continue; }
      else { tx = px - o.x; ty = py - o.y; if (o.hflip) tx = o.w - 1 - tx; }
      const tpr = oneD ? o.w / 8 : 32;
      const t = o.tile + (ty >> 3) * tpr + (tx >> 3);
      const c = tile4(0x10000, t, tx & 7, ty & 7);
      if (c){ best = 256 + o.pal * 16 + c; bestP = o.prio; break; }
    }
    let [r, g, b] = color(best ?? 0);
    const bld = r16(io, 0x50), eff = (bld >> 6) & 3, evy = Math.min(16, shadow[16] & 31);
    if (eff === 2){ r += (255 - r) * evy / 16; g += (255 - g) * evy / 16; b += (255 - b) * evy / 16; }
    if (eff === 3){ r -= r * evy / 16; g -= g * evy / 16; b -= b * evy / 16; }
    const d = (py * W + px) * 4; rgba[d] = r; rgba[d + 1] = g; rgba[d + 2] = b; rgba[d + 3] = 255;
  }
  writePNG(outPng, W, H, rgba, 2);
}
