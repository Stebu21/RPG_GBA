// Cavalcature 32x16 (vista di lato, rivolte a sinistra): cavallo e asinello, due fotogrammi di passo,
// sella rossa. Sono sprite OBJ separati che stanno sotto l'eroe.
import { Img, cArray, rgb15, hex } from './pixel.mjs';

// indici: 1 contorno, 2 corpo, 3 ombra, 4 luce, 5 criniera/coda, 6 sella, 7 sella scura, 8 zoccolo/occhio, 9 muso, 10 bianco
const PALS = {
  cavallo: ['#000000', '#28180e', '#a4623a', '#7c4428', '#c88458', '#2a1a12', '#c83838', '#7a1c20', '#1c1410', '#d8a888', '#f8f4ec'],
  asino:   ['#000000', '#2c2a28', '#a09a92', '#78726a', '#c4beb4', '#4a4640', '#c88030', '#7c4c18', '#1c1a18', '#e4dccc', '#f8f4ec'],
};
const inEll = (x, y, cx, cy, rx, ry)=>((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;

function draw(kind, frame){
  const img = new Img(32, 16), horse = kind === 'cavallo';
  const P = (x, y, c)=>img.set(x, y, c);
  const rect = (x, y, w, h, c)=>img.rect(x, y, w, h, c);
  // gambe: quattro, con il passo (le diagonali si alzano insieme)
  const legs = [[9, 0], [12, 1], [21, 1], [24, 0]];       // x, gruppo
  legs.forEach(([x, g])=>{
    const up = (g === frame) ? 2 : 0, len = 6 - up;
    rect(x, 10 + up, 2, len, C.body); rect(x + 1, 10 + up, 1, len, C.dark);
    rect(x, 15 - (g === frame ? 2 : 0) - 1, 2, 1, C.hoof);
  });
  // corpo e petto
  for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++){
    if (inEll(x, y, 17, 8, 9.5, 4.6)) P(x, y, y < 5 ? C.light : y > 9 ? C.dark : C.body);
  }
  // collo e testa
  for (let y = 0; y < 12; y++) for (let x = 0; x < 14; x++){
    const neck = x >= 5 && x <= 11 && y >= 2 && y <= 9 && (x - 5) * 1.3 + (y - 2) * 0.55 >= 0 && (11 - x) * 1.1 + (y - 2) * 0.6 >= 1.5 && y <= 4 + (11 - x) * 0.9 + 3;
    const head = x >= 1 && x <= 6 && y >= (horse ? 2 : 3) && y <= (horse ? 7 : 8) && (x + (y - 2) * 0.35 >= 2);
    if (neck || head) P(x, y, y <= 3 ? C.light : (x < 3 ? C.body : C.dark));
  }
  rect(1, 6, 3, 2, C.muzzle); P(1, 7, C.dark); P(3, 3, C.eye);
  // orecchie (l'asino le ha lunghe) e criniera
  if (horse){ rect(6, 0, 2, 2, C.body); P(6, 0, C.dark); for (let i = 0; i < 5; i++) rect(8 + i, 1 + i, 1, 3, C.mane); }
  else { rect(5, 0, 2, 3, C.body); rect(8, 0, 2, 3, C.body); P(6, 1, C.muzzle); P(9, 1, C.muzzle); for (let i = 0; i < 4; i++) rect(10 + i, 2 + i, 1, 2, C.mane); }
  // coda
  if (horse) for (let i = 0; i < 6; i++){ rect(26 + (i > 3 ? 1 : 0) + (frame ? 0 : 1), 5 + i, 2, 1, C.mane); }
  else { rect(27, 5, 1, 5, C.mane); rect(27, 10, 2, 2, C.mane); }
  // sella con coperta e staffa
  rect(14, 3, 7, 3, C.sad); rect(14, 3, 7, 1, C.sadd); rect(15, 6, 5, 3, C.sad); rect(15, 8, 5, 1, C.sadd); rect(17, 9, 1, 3, C.hoof);
  // contorno
  const out = img.clone();
  for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) if (!img.get(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy])=>img.get(x + dx, y + dy) > 1)) out.set(x, y, C.ol);
  return out;
}
const C = { ol:1, body:2, dark:3, light:4, mane:5, sad:6, sadd:7, hoof:8, muzzle:9, eye:1, white:10 };

export const MOUNTS = ['asino', 'cavallo'];       // id 1 = asino, 2 = cavallo
export function drawMount(kind, frame){ return draw(kind, frame); }
export const mountPal = kind=>PALS[kind].map(hex);
export function genMounts(){
  let c = '';
  const data = [];
  for (const kind of MOUNTS) for (const frame of [0, 1]){
    const img = draw(kind, frame);
    // 1D: righe di 4 tile per 2 righe (32x16)
    for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 4; tx++){ const b = img.tile4(tx, ty); for (let k = 0; k < 32; k += 2) data.push(b[k] | (b[k + 1] << 8)); }
  }
  c += cArray('u16', 'MOUNT_GFX', data, 16);   // [mount][frame][8 tile * 16]
  const rows = MOUNTS.map(k=>{ const p = mountPal(k).map(rgb15); while (p.length < 16) p.push(0); return '  {' + p.join(',') + '}'; });
  c += 'const u16 MOUNT_PAL[2][16] = {\n' + rows.join(',\n') + '\n};\n';
  return c;
}
