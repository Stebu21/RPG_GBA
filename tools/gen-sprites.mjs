// Mostri (64x64) e ritratti (32x32) ricavati dal disegno vettoriale del gioco web, ridotti a 16 colori
// con contorno scuro, come gli sprite di battaglia GBA. Serve Chrome (puppeteer del progetto web).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { createRequire } from 'node:module';
import { Img, rgb15, cArray } from './pixel.mjs';
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
      const t = document.createElement('canvas'); t.width = 64; t.height = 64; const g = t.getContext('2d');
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(cv, (64 - size) / 2, 64 - size, size, size);
      res.mons[id] = [...g.getImageData(0, 0, 64, 64).data];
    }
    for (const [id, c] of Object.entries(chars)){ const cv = document.createElement('canvas'); S.drawPortrait(cv, c); res.portraits[id] = grab(cv, 32, 32); }
    // titolo: notte sul Sacro Monte, santuario illuminato, scritta dorata
    const T = document.createElement('canvas'); T.width = 240; T.height = 160; const g = T.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, 160); sky.addColorStop(0, '#0b1030'); sky.addColorStop(0.6, '#3a2c68'); sky.addColorStop(1, '#a0507a'); g.fillStyle = sky; g.fillRect(0, 0, 240, 160);
    let s = 3; const rnd = ()=>((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 60; i++){ g.fillStyle = rnd() < 0.3 ? '#fff6c0' : '#c8d0ff'; g.fillRect(rnd() * 240 | 0, rnd() * 90 | 0, 1, 1); }
    g.fillStyle = '#f8f0c8'; g.beginPath(); g.arc(222, 14, 8, 0, 7); g.fill(); g.fillStyle = '#0b1030'; g.beginPath(); g.arc(218, 12, 7, 0, 7); g.fill();
    g.fillStyle = '#1c1838'; g.beginPath(); g.moveTo(0, 160); g.lineTo(0, 120); g.lineTo(40, 104); g.lineTo(80, 118); g.lineTo(120, 100); g.lineTo(150, 108); g.lineTo(190, 92); g.lineTo(240, 116); g.lineTo(240, 160); g.fill();
    g.fillStyle = '#120f26'; g.beginPath(); g.moveTo(0, 160); g.lineTo(0, 138); g.lineTo(60, 128); g.lineTo(110, 140); g.lineTo(170, 126); g.lineTo(240, 138); g.lineTo(240, 160); g.fill();
    g.fillStyle = '#f0e0b0'; g.fillRect(114, 92, 12, 9); g.fillRect(118, 85, 4, 7); g.fillRect(119, 82, 2, 3); g.fillStyle = '#ffd060'; g.fillRect(118, 95, 4, 6);
    g.textAlign = 'center';
    const title = (txt, y, size)=>{ g.font = `bold ${size}px Georgia, serif`; g.lineWidth = 4; g.strokeStyle = '#1a0c10'; g.strokeText(txt, 120, y);
      const gold = g.createLinearGradient(0, y - size, 0, y); gold.addColorStop(0, '#fff4b0'); gold.addColorStop(0.5, '#f0b030'); gold.addColorStop(1, '#a05010'); g.fillStyle = gold; g.fillText(txt, 120, y); };
    title('THE MENACE', 36, 22); title('OF ETERNA', 60, 22);
    g.font = 'italic 11px Georgia, serif'; g.fillStyle = '#e0d0ff'; g.fillText('~ Chronicles of Varese ~', 120, 76);
    res.title = [...g.getImageData(0, 0, 240, 160).data];
    return res;
  }, MONSTERS, CHARACTERS);
  await browser.close(); server.close();

  let c = '';
  const preview = [];
  for (const id of MON_IDS){
    const { img, pal } = quantize(out.mons[id], 64, 64);
    c += cArray('u16', `MON_GFX_${cname(id)}`, toTiles(img, 8, 8), 16) + cArray('u16', `MON_PAL_${cname(id)}`, pal.map(rgb15));
    preview.push({ img, pal });
  }
  for (const id of CHAR_IDS){
    const { img, pal } = quantize(out.portraits[id], 32, 32, false, 14);
    c += cArray('u16', `PORTRAIT_${cname(id)}`, toTiles(img, 4, 4), 16) + cArray('u16', `PORTRAIT_PAL_${cname(id)}`, pal.map(rgb15));
    preview.push({ img, pal, opaque:true });
  }
  // titolo: tile 8x8 senza doppioni e mappa 30x20 (32 di larghezza, come la schermata BG)
  { const { img, pal } = quantize(out.title, 240, 160, false, 14);
    const tiles = [], idx = new Map(), map = [];
    for (let ty = 0; ty < 20; ty++) for (let tx = 0; tx < 32; tx++){
      if (tx >= 30){ map.push(0); continue; }
      const b = img.tile4(tx, ty), k = Buffer.from(b).toString('hex');
      if (!idx.has(k)){ idx.set(k, tiles.length); tiles.push(b); }
      map.push(idx.get(k));
    }
    c += cArray('u16', 'TITLE_TILES', tiles.flatMap(b=>{ const o = []; for (let i = 0; i < 32; i += 2) o.push(b[i] | (b[i + 1] << 8)); return o; }), 16);
    c += `const u16 TITLE_NTILES = ${tiles.length};
` + cArray('u16', 'TITLE_MAP', map) + cArray('u16', 'TITLE_PAL', pal.map(rgb15));
    preview.push({ img, pal, opaque:true, title:true });
    console.log('titolo:', tiles.length, 'tile');
  }
  return { c, preview };
}
