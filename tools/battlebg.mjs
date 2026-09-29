// Sfondi di battaglia 240x160 a colori pieni (poi convertiti in tile e tavolozze GBA):
// cielo a fasce, nuvole, profilo lontano della zona, fila d'alberi o edifici, prato e piattaforme.
import { hash2 } from './pixel.mjs';

const H = s=>parseInt(s.slice(1), 16);
const mix = (a, b, t)=>{ const r = (a >> 16) + ((b >> 16) - (a >> 16)) * t, g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t, bl = (a & 255) + ((b & 255) - (a & 255)) * t; return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl); };
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

export const BATTLE_BACKS = [
  { name:'varese', sky:['#58a0f0', '#88c0f8', '#b8e0ff', '#e0f4ff'], clouds:true, far:['#90a8d0', '#b0c4e0', '#708cb8'], farKind:'mountains',
    mid:['#3c8c48', '#58a850', '#80c860', '#2c6c3c'], midKind:'trees', ground:['#68b858', '#80c868', '#98d878', '#509848'], plat:['#b0e088', '#90d070', '#68b058', '#488c44'] },
  { name:'vedano', sky:['#4890d8', '#70b0f0', '#a0d0f8', '#c8e8ff'], clouds:true, far:['#3c7048', '#4c8458', '#2c5838'], farKind:'forest',
    mid:['#2c6c3c', '#3c8448', '#58a050', '#1c4c2c'], midKind:'pines', ground:['#509840', '#60a848', '#78b858', '#3c7c34'], plat:['#98c870', '#78b458', '#589844', '#3c7834'] },
  { name:'castiglione', sky:['#4c3c78', '#7c5890', '#c07898', '#f0a898'], clouds:false, far:['#584870', '#6c5880', '#44385c'], farKind:'hills',
    mid:['#5c5068', '#786c80', '#948898', '#403848'], midKind:'ruins', ground:['#7c7460', '#8c8470', '#a09880', '#605848'], plat:['#b8ac90', '#a09478', '#807860', '#605848'] },
  { name:'jerago', sky:['#d05838', '#e88048', '#f8b060', '#f8d890'], clouds:true, far:['#904838', '#a86040', '#783828'], farKind:'hills',
    mid:['#6c4030', '#8c5838', '#a87448', '#4c2c20'], midKind:'castle', ground:['#a08848', '#b09858', '#c8b070', '#806838'], plat:['#d8c088', '#c0a870', '#a08850', '#806838'] },
  { name:'samarate', sky:['#788098', '#909cb0', '#a8b4c4', '#c4ccd8'], clouds:true, far:['#687080', '#7c8490', '#586070'], farKind:'city',
    mid:['#5c6470', '#747c88', '#9098a0', '#444c58'], midKind:'hangars', ground:['#8c8c84', '#9c9c94', '#b0b0a8', '#70706c'], plat:['#c0c0b8', '#a8a8a0', '#8c8c84', '#6c6c68'] },
  { name:'sacromonte', sky:['#0c1030', '#18204c', '#2c2c68', '#484080'], clouds:false, stars:true, far:['#1c2040', '#283058', '#141830'], farKind:'mountains',
    mid:['#282848', '#383860', '#4c4c78', '#1c1c34'], midKind:'shrine', ground:['#383458', '#443c68', '#544c78', '#2c2848'], plat:['#6c6098', '#584c84', '#443c6c', '#302a50'] },
];

export function paintBattleBack(b, bi){
  const W = 240, Hh = 160, img = new Int32Array(W * Hh);
  const set = (x, y, c)=>{ x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < Hh) img[y * W + x] = c; };
  const get = (x, y)=>img[y * W + x];
  const sky = b.sky.map(H), far = b.far.map(H), mid = b.mid.map(H), gr = b.ground.map(H), pl = b.plat.map(H);
  const HOR = 64;                      // orizzonte (inizio del prato)
  // cielo: quattro fasce con retinatura ordinata ai confini
  for (let y = 0; y < HOR; y++) for (let x = 0; x < W; x++){
    const t = y / HOR * 3, i = Math.min(2, t | 0), f = t - i;
    set(x, y, f * 16 > BAYER[y & 3][x & 3] + 4 ? sky[i + 1] : sky[i]);
  }
  if (b.stars) for (let i = 0; i < 70; i++){ const x = hash2(i, 3, bi) * W | 0, y = hash2(i, 5, bi) * 48 | 0; set(x, y, i % 7 ? H('#c8d0f8') : H('#ffffff')); if (i % 11 === 0){ set(x + 1, y, H('#8890c8')); set(x - 1, y, H('#8890c8')); set(x, y + 1, H('#8890c8')); set(x, y - 1, H('#8890c8')); } }
  if (b.stars){ // luna
    for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++){ const d = Math.hypot(x, y); if (d <= 9) set(196 + x, 16 + y, d > 8 ? H('#c8c8e0') : Math.hypot(x - 3, y + 2) < 3 ? H('#e0e0f0') : H('#f8f8ff')); }
  }
  // nuvole: grappoli di cerchi, bianche con ombra azzurra sotto
  if (b.clouds){
    const cl = H('#ffffff'), cs = mix(sky[1], H('#ffffff'), 0.55), cd = mix(sky[1], H('#ffffff'), 0.25);
    for (const [cx, cy, s] of [[36, 16, 1], [150, 10, 0.8], [210, 26, 0.7], [96, 30, 0.6]]){
      const blobs = [[0, 0, 9], [10, -3, 8], [20, 1, 7], [-9, 3, 6], [28, 4, 5]].map(([x, y, r])=>[cx + x * s * 1.3, cy + y * s, r * s + 2]);
      for (let y = cy - 16; y < cy + 12; y++) for (let x = cx - 24; x < cx + 50; x++){
        const inb = blobs.some(([bx, by, r])=>(x - bx) ** 2 + ((y - by) * 1.3) ** 2 <= r * r);
        if (!inb || y > cy + 6 * s + 2) continue;
        const low = !blobs.some(([bx, by, r])=>(x - bx) ** 2 + ((y + 3 - by) * 1.3) ** 2 <= r * r);
        set(x, y, low ? cd : y > cy + 2 * s ? cs : cl);
      }
    }
  }
  // profilo lontano (y fino a HOR)
  const ridge = (x, base, amp, k)=>base - amp * (0.55 * Math.sin(x * 0.021 * k + bi) + 0.3 * Math.sin(x * 0.057 * k + 1.3) + 0.15 * Math.sin(x * 0.13 + 2));
  for (let x = 0; x < W; x++){
    if (b.farKind === 'mountains' || b.farKind === 'hills'){
      const top = ridge(x, b.farKind === 'mountains' ? 34 : 44, b.farKind === 'mountains' ? 16 : 9, 1);
      for (let y = top | 0; y < HOR; y++){
        const slope = ridge(x + 1, 34, 16, 1) - ridge(x - 1, 34, 16, 1);
        let c = far[0];
        if (y < top + 2) c = far[1];
        else if (slope > 0.3) c = far[2];
        if (b.farKind === 'mountains' && !b.stars && y < top + 4 && top < 26) c = H('#f0f4ff');
        set(x, y, c);
      }
    } else if (b.farKind === 'forest'){
      const top = 36 + Math.abs(((x % 14) - 7)) * 0.9 - (hash2(x / 14 | 0, 1, bi) * 6);
      for (let y = top | 0; y < HOR; y++) set(x, y, y < top + 2 ? far[1] : ((x / 14 | 0) & 1) ? far[0] : far[2]);
    } else if (b.farKind === 'city'){
      const bw = 10 + (hash2(x / 12 | 0, 2, bi) * 8 | 0), top = 30 + hash2(x / 12 | 0, 4, bi) * 18;
      for (let y = top | 0; y < HOR; y++) set(x, y, (x % 12 === 0) ? far[2] : ((y - top) % 5 === 2 && x % 3 === 1) ? far[1] : far[0]);
      void bw;
    }
  }
  // fila intermedia vicina all'orizzonte
  const midBase = HOR;
  if (b.midKind === 'trees' || b.midKind === 'pines'){
    for (let k = -1; k < 17; k++){
      const cx = k * 16 + (hash2(k, 7, bi) * 6 | 0), h = 14 + hash2(k, 9, bi) * 8, r = 9 + hash2(k, 11, bi) * 3;
      for (let y = midBase - h - r; y < midBase; y++) for (let x = cx - r - 1; x <= cx + r + 1; x++){
        let inside;
        if (b.midKind === 'pines'){ const w = (y - (midBase - h - r)) / (h + r) * (r + 1); inside = Math.abs(x - cx) <= w && y < midBase - 2; }
        else inside = (x - cx) ** 2 + (y - (midBase - h)) ** 2 <= r * r || (y >= midBase - h && Math.abs(x - cx) <= r - (y - (midBase - h)) * 0.2);
        if (!inside) continue;
        const nx = (x - cx) / r, ny = (y - (midBase - h)) / r;
        const lit = -nx * 0.6 - ny * 0.6;
        set(x, y, lit > 0.45 ? mid[2] : lit > 0 ? mid[1] : lit > -0.5 ? mid[0] : mid[3]);
      }
    }
  } else if (b.midKind === 'ruins' || b.midKind === 'castle' || b.midKind === 'hangars' || b.midKind === 'shrine'){
    const blocks = b.midKind === 'castle' ? [[30, 26, 34, 1], [64, 70, 20, 1], [134, 22, 42, 1], [156, 50, 16, 1]]
      : b.midKind === 'ruins' ? [[14, 14, 26, 1], [40, 10, 16, 0], [150, 40, 30, 1], [196, 12, 22, 0]]
      : b.midKind === 'shrine' ? [[98, 44, 26, 0], [112, 16, 42, 0]]
      : [[6, 70, 22, 2], [88, 70, 24, 2], [170, 70, 20, 2]];
    for (const [x0, w, h, kind] of blocks) for (let x = x0; x < x0 + w; x++){
      let top = midBase - h;
      if (kind === 2) top = midBase - 8 - Math.sqrt(Math.max(0, (w / 2) ** 2 - (x - x0 - w / 2) ** 2)) * (h - 8) / (w / 2);
      for (let y = top | 0; y < midBase; y++){
        if (kind === 1 && y < top + 4 && ((x - x0) % 6) < 3) continue;           // merli
        let c = x < x0 + 2 ? mid[2] : x > x0 + w - 3 ? mid[3] : ((y >> 2) & 1) ? mid[0] : mid[1];
        if (kind === 2) c = (x - x0) % 8 === 0 ? mid[3] : y < top + 2 ? mid[2] : mid[1];
        if (b.midKind === 'shrine' && Math.abs(x - 125) < 4 && y > midBase - 14) c = H('#f8d870');
        set(x, y, c);
      }
    }
    if (b.midKind === 'shrine') for (let y = midBase - 50; y < midBase - 42; y++){ set(124, y, H('#f8d870')); set(125, y, H('#f8d870')); }
    if (b.midKind === 'shrine') for (let x = 121; x < 129; x++) set(x, midBase - 47, H('#f8d870'));
  }
  // prato: fasce che si allargano verso il basso (prospettiva) e ciuffi
  for (let y = HOR; y < Hh; y++){
    const t = (y - HOR) / (Hh - HOR), band = Math.floor(Math.pow(t, 0.7) * 7);
    for (let x = 0; x < W; x++){
      let c = band % 2 ? gr[0] : gr[1];
      if (y === HOR) c = gr[3];
      else if (y === HOR + 1) c = gr[0];
      set(x, y, c);
    }
  }
  for (let i = 0; i < 90; i++){
    const x = hash2(i, 13, bi) * W | 0, y = HOR + 4 + (hash2(i, 17, bi) ** 0.8) * (Hh - HOR - 6) | 0, s = 1 + ((y - HOR) / 30 | 0);
    for (let k = 0; k < s; k++){ set(x - k, y - k, gr[2]); set(x + k + 1, y - k, gr[2]); } set(x, y, gr[3]); set(x + 1, y, gr[3]);
  }
  // piattaforme: nemici a sinistra, squadra a destra (ellissi con bordo scuro, centro chiaro, ciuffi)
  const plat = (cx, cy, rx, ry)=>{
    for (let y = -ry - 1; y <= ry + 2; y++) for (let x = -rx - 1; x <= rx + 1; x++){
      const d = (x / rx) ** 2 + (y / ry) ** 2;
      const ds = (x / rx) ** 2 + ((y - 2) / ry) ** 2;
      if (d <= 1){
        let c = d > 0.82 ? (y > 0 ? pl[3] : pl[2]) : d > 0.5 ? pl[1] : pl[0];
        if (d <= 0.82 && y > ry * 0.45) c = pl[2];
        if (d < 0.5 && ((x * 7 + y * 13) % 23 === 0)) c = pl[1];
        set(cx + x, cy + y, c);
      } else if (ds <= 1) set(cx + x, cy + y, gr[3]);
    }
  };
  plat(66, 74, 64, 11); plat(186, 88, 56, 11);
  return img;
}
