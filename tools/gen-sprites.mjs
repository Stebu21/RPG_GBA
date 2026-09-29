// Mostri (64x64) e ritratti (32x32) ricavati dal disegno vettoriale del gioco web, ridotti a 16 colori
// con contorno scuro, come gli sprite di battaglia GBA. Serve Chrome (puppeteer del progetto web).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { createRequire } from 'node:module';
import { Img, rgb15, cArray } from './pixel.mjs';
import { convertLayers, quantizeTiles } from './gba-convert.mjs';
import { MONSTERS, MON_IDS, CHARACTERS, CHAR_IDS, cname } from './gen-common.mjs';

const require = createRequire('C:/Users/StefanoBulgheroni/Documents/Stefano/RPG/package.json');
const puppeteer = require('puppeteer-core');
const ROOT = 'C:/Users/StefanoBulgheroni/Documents/Stefano/RPG/www';

// median cut: palette di n colori per i pixel opachi
function medianCut(px, n){
  let boxes = [px];
  while (boxes.length < n){
    boxes.sort((a, b)=>b.length - a.length);
    const box = boxes.shift();
    if (!box || box.length < 2){ if (box) boxes.push(box); break; }
    const rng = [0, 1, 2].map(k=>Math.max(...box.map(p=>p[k])) - Math.min(...box.map(p=>p[k])));
    const k = rng.indexOf(Math.max(...rng));
    box.sort((a, b)=>a[k] - b[k]);
    boxes.push(box.slice(0, box.length >> 1), box.slice(box.length >> 1));
  }
  return boxes.filter(b=>b.length).map(b=>[0, 1, 2].map(k=>Math.round(b.reduce((s, p)=>s + p[k], 0) / b.length)));
}
// rgba (w*h*4) -> Img a indici + palette (0 trasparente, 1 contorno)
export function quantize(rgba, w, h, outline=true, ncol=14){
  const px = [];
  for (let i = 0; i < w * h; i++) if (rgba[i * 4 + 3] > 110) px.push([rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]]);
  const pal = medianCut(px, ncol).sort((a, b)=>(a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
  const img = new Img(w, h);
  for (let i = 0; i < w * h; i++){
    if (rgba[i * 4 + 3] <= 110) continue;
    let best = 0, bd = Infinity;
    pal.forEach((p, k)=>{ const d = (p[0] - rgba[i * 4]) ** 2 + (p[1] - rgba[i * 4 + 1]) ** 2 + (p[2] - rgba[i * 4 + 2]) ** 2; if (d < bd){ bd = d; best = k; } });
    img.p[i] = best + 2;
  }
  if (outline){
    const src = img.clone();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!src.get(x, y) && [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy])=>src.get(x + dx, y + dy) > 1)) img.set(x, y, 1);
  }
  const full = [[0, 0, 0], [20, 16, 28], ...pal];
  while (full.length < 16) full.push([0, 0, 0]);
  return { img, pal:full };
}
// mostri più "da GBA": alfa netto, colori più saturi, luce dall'alto a sinistra e ombra verso il basso a destra
// (a cuscino, secondo la distanza dal bordo della sagoma), filo scuro interno sul lato in ombra
function modeDown(rgba, W, k){
  const w = W / k, o = new Uint8ClampedArray(w * w * 4);
  for (let by = 0; by < w; by++) for (let bx = 0; bx < w; bx++){
    const cnt = new Map(); let op = 0;
    for (let y = 0; y < k; y++) for (let x = 0; x < k; x++){
      const i = ((by * k + y) * W + bx * k + x) * 4; if (rgba[i + 3] < 128) continue; op++;
      const key = ((rgba[i] >> 4) << 8) | ((rgba[i + 1] >> 4) << 4) | (rgba[i + 2] >> 4);
      const e = cnt.get(key) || { n:0, r:0, g:0, b:0 }; e.n++; e.r += rgba[i]; e.g += rgba[i + 1]; e.b += rgba[i + 2]; cnt.set(key, e);
    }
    const d = (by * w + bx) * 4;
    if (op * 2 < k * k) continue;
    let best = null; for (const e of cnt.values()) if (!best || e.n > best.n) best = e;
    o[d] = best.r / best.n; o[d + 1] = best.g / best.n; o[d + 2] = best.b / best.n; o[d + 3] = 255;
  }
  return o;
}
function crisp(rgba, w, h){
  const o = Uint8ClampedArray.from(rgba), inM = (x, y)=>x >= 0 && y >= 0 && x < w && y < h && rgba[(y * w + x) * 4 + 3] > 110;
  const run = (x, y, dx, dy)=>{ let n = 0; while (n < 12 && inM(x + dx * (n + 1), y + dy * (n + 1))) n++; return n; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
    const i = (y * w + x) * 4;
    if (!inM(x, y)){ o[i + 3] = 0; continue; }
    o[i + 3] = 255;
    const tl = run(x, y, -1, -1), br = run(x, y, 1, 1), up = run(x, y, 0, -1), dn = run(x, y, 0, 1);
    let f = 1 + 0.16 * Math.max(-1, Math.min(1, (br - tl) / (br + tl + 1))) + 0.06 * Math.max(-1, Math.min(1, (dn - up) / (dn + up + 1)));
    if (br === 0 || dn === 0) f *= 0.72; else if (br === 1) f *= 0.86;
    if (tl === 0 && up <= 1) f *= 1.12;
    let r = rgba[i] * f, g = rgba[i + 1] * f, b = rgba[i + 2] * f;
    const m = (r + g + b) / 3; r = m + (r - m) * 1.2; g = m + (g - m) * 1.2; b = m + (b - m) * 1.2;
    o[i] = r; o[i + 1] = g; o[i + 2] = b;
  }
  return o;
}
const toTiles = (img, tw, th)=>{ const out = []; for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++){ const b = img.tile4(tx, ty); for (let k = 0; k < 32; k += 2) out.push(b[k] | (b[k + 1] << 8)); } return out; };

export async function genSprites(){
  const server = http.createServer(async (q, r)=>{ if (q.url === '/blank'){ r.writeHead(200, { 'Content-Type':'text/html' }); r.end('<!doctype html><title>gen</title>'); return; } try { const p = q.url === '/' ? '/index.html' : q.url.split('?')[0]; const d = await readFile(join(ROOT, p)); r.writeHead(200, { 'Content-Type':{ '.js':'text/javascript', '.html':'text/html' }[extname(p)] || 'application/octet-stream' }); r.end(d); } catch { r.writeHead(404); r.end(); } });
  await new Promise(r=>server.listen(8790, r));
  const browser = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:8790/blank', { waitUntil:'domcontentloaded' });
  const out = await page.evaluate(async (mons, chars)=>{
    const S = await import('/js/engine/sprites.js');
    const grab = (cv, w, h)=>{ const t = document.createElement('canvas'); t.width = w; t.height = h; const g = t.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(cv, 0, 0, w, h); return [...g.getImageData(0, 0, w, h).data]; };
    const res = { mons:{}, portraits:{} };
    for (const [id, m] of Object.entries(mons)){
      // disegno grande poi ridotto: bordi più puliti; i mostri normali più piccoli dei boss
      const cv = document.createElement('canvas'); S.drawMonster(cv, m, 12);
      const size = id.startsWith('boss') ? 64 : 50;
      // a 4x: poi ogni blocco 4x4 prende il colore più frequente (bordi netti, niente sfumature da media)
      const t = document.createElement('canvas'); t.width = 256; t.height = 256; const g = t.getContext('2d');
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(cv, (64 - size) * 2, (64 - size) * 4, size * 4, size * 4);
      res.mons[id] = [...g.getImageData(0, 0, 256, 256).data];
    }
    for (const [id, c] of Object.entries(chars)){ const cv = document.createElement('canvas'); S.drawPortrait(cv, c); res.portraits[id] = grab(cv, 32, 32); }
    // titolo: notte sul Sacro Monte, il lago di Varese sotto la luna, scritta dorata in rilievo
    const T = document.createElement('canvas'); T.width = 240; T.height = 160; const g = T.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, 112); sky.addColorStop(0, '#070a24'); sky.addColorStop(0.45, '#241c58'); sky.addColorStop(0.8, '#5a3474'); sky.addColorStop(1, '#b0587a'); g.fillStyle = sky; g.fillRect(0, 0, 240, 160);
    let s = 7; const rnd = ()=>((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 90; i++){ const x = rnd() * 240 | 0, y = rnd() * 96 | 0, big = rnd() < 0.08; g.fillStyle = rnd() < 0.3 ? '#fff4c8' : '#c8d4ff'; g.fillRect(x, y, 1, 1); if (big){ g.globalAlpha = 0.6; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); g.globalAlpha = 1; } }
    // luna con alone
    g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(224, 13, 7, 0, 7); g.fill(); g.fillStyle = '#e8dcb8'; g.beginPath(); g.arc(222, 11, 1.6, 0, 7); g.arc(226, 16, 1.2, 0, 7); g.fill();
    // montagne lontane (Campo dei Fiori) con il bordo illuminato dalla luna
    const ridge = (pts, fill, rim)=>{ g.fillStyle = fill; g.beginPath(); g.moveTo(0, 160); for (const [x, y] of pts) g.lineTo(x, y); g.lineTo(240, 160); g.fill(); if (rim){ g.strokeStyle = rim; g.lineWidth = 1; g.beginPath(); pts.forEach(([x, y], i)=>i ? g.lineTo(x, y + 0.5) : g.moveTo(x, y + 0.5)); g.stroke(); } };
    ridge([[0, 104], [22, 96], [48, 100], [76, 86], [104, 94], [130, 88], [150, 96], [176, 90], [200, 98], [240, 92]], '#2c2458', '#6c5c9c');
    // Sacro Monte a destra: colle con il santuario illuminato e le cappelle lungo la salita
    ridge([[0, 126], [70, 120], [130, 116], [160, 106], [182, 98], [198, 94], [212, 96], [226, 104], [240, 108]], '#1c1840', '#4c4488');
    g.fillStyle = '#f0e0b0'; g.fillRect(192, 86, 14, 9); g.fillRect(196, 79, 6, 7); g.fillRect(198, 75, 2, 4); g.fillStyle = '#3a2c50'; g.fillRect(192, 86, 14, 1);
    g.fillStyle = '#ffd060'; g.fillRect(194, 89, 2, 3); g.fillRect(202, 89, 2, 3); g.fillRect(198, 88, 2, 5); g.fillRect(198, 81, 2, 2);
    for (const [x, y] of [[186, 101], [178, 104], [170, 108], [160, 111], [150, 114], [140, 117]]){ g.fillStyle = '#ffe080'; g.fillRect(x, y, 2, 2); }
    // lago con il riflesso della luna
    const lake = g.createLinearGradient(0, 126, 0, 160); lake.addColorStop(0, '#2a2860'); lake.addColorStop(1, '#141638'); g.fillStyle = lake; g.fillRect(0, 128, 240, 32);
    for (let y = 130; y < 158; y += 3){ const w = 10 + (y - 130) * 0.9; g.fillStyle = y % 2 ? '#e8dcb0' : '#a89cc8'; g.fillRect(224 - w / 2 + ((y * 7) % 5) - 2, y, w * (0.4 + ((y * 13) % 7) / 12), 1); }
    for (let i = 0; i < 20; i++){ g.fillStyle = '#5a58a0'; g.fillRect(rnd() * 180 | 0, 132 + rnd() * 26 | 0, 4 + rnd() * 10 | 0, 1); }
    // riva e alberi scuri in primo piano
    g.fillStyle = '#0c0a1c'; g.beginPath(); g.moveTo(0, 160); g.lineTo(0, 124); for (let x = 0; x <= 72; x += 6) g.lineTo(x, 122 - (x % 12 ? 6 : 12) + (x > 50 ? (x - 50) * 0.5 : 0)); g.lineTo(90, 134); g.lineTo(60, 160); g.fill();
    g.textAlign = 'center';
    const title = (txt, y, size)=>{
      g.font = `bold ${size}px Georgia, serif`;
      g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = '#140818'; g.strokeText(txt, 120, y + 1);
      g.lineWidth = 3; g.strokeStyle = '#6a3010'; g.strokeText(txt, 120, y);
      const gold = g.createLinearGradient(0, y - size * 0.8, 0, y); gold.addColorStop(0, '#fffae0'); gold.addColorStop(0.35, '#f8d060'); gold.addColorStop(0.6, '#e09020'); gold.addColorStop(1, '#a85810'); g.fillStyle = gold; g.fillText(txt, 120, y);
    };
    title('THE MENACE', 34, 24); title('OF ETERNA', 60, 24);
    g.font = 'italic bold 11px Georgia, serif'; g.lineWidth = 3; g.strokeStyle = '#140818'; g.strokeText('~ Chronicles of Varese ~', 120, 77); g.fillStyle = '#e8d8ff'; g.fillText('~ Chronicles of Varese ~', 120, 77);
    res.title = [...g.getImageData(0, 0, 240, 160).data];
    return res;
  }, MONSTERS, CHARACTERS);
  await browser.close(); server.close();

  let c = '';
  const preview = [];
  for (const id of MON_IDS){
    const { img, pal } = quantize(crisp(modeDown(out.mons[id], 256, 4), 64, 64), 64, 64);
    c += cArray('u16', `MON_GFX_${cname(id)}`, toTiles(img, 8, 8), 16) + cArray('u16', `MON_PAL_${cname(id)}`, pal.map(rgb15));
    preview.push({ img, pal });
  }
  for (const id of CHAR_IDS){
    const { img, pal } = quantize(out.portraits[id], 32, 32, false, 14);
    c += cArray('u16', `PORTRAIT_${cname(id)}`, toTiles(img, 4, 4), 16) + cArray('u16', `PORTRAIT_PAL_${cname(id)}`, pal.map(rgb15));
    preview.push({ img, pal, opaque:true });
  }
  // titolo: 60 colori (median cut), poi tile e tavolozze GBA 8..14 come le mappe
  { const src = new Int32Array(240 * 160); for (let i = 0; i < src.length; i++) src[i] = (out.title[i * 4] << 16) | (out.title[i * 4 + 1] << 8) | out.title[i * 4 + 2];
    const rgb = quantizeTiles(src, 240, 160, 7);
    const { img, pal } = quantize(out.title, 240, 160, false, 14);
    const r = convertLayers([{ f0:rgb, f1:null }], 240, 160, { name:'titolo', maxPals:7, maxTiles:1000 });
    const map = []; for (let ty = 0; ty < 20; ty++) for (let tx = 0; tx < 32; tx++) map.push(tx < 30 ? (r.maps[0][ty * 30 + tx] & 0x0FFF) | ((((r.maps[0][ty * 30 + tx] >> 12) || 1) + 7) << 12) : 0);
    c += cArray('u16', 'TITLE_TILES', r.tiles, 16) + `const u16 TITLE_NTILES = ${r.ntiles};
const u8 TITLE_NPAL = ${r.pals.length};
` + cArray('u16', 'TITLE_MAP', map);
    c += cArray('u16', 'TITLE_PAL', r.pals.flatMap(p=>{ const o = [...p]; while (o.length < 16) o.push(0); return o; }));
    preview.push({ rgb, opaque:true, title:true });
    console.log('titolo:', r.ntiles, 'tile,', r.pals.length, 'tavolozze');
  }
  return { c, preview };
}
