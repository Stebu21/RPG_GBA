// Interfaccia (cornici, cursori, frecce, forzieri) e sfondi di battaglia per zona.
import { Img, hex, rgb15, cArray, hash2 } from './pixel.mjs';

const tilesOf = (img, tw, th)=>{ const out = []; for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++){ const b = img.tile4(tx, ty); for (let k = 0; k < 32; k += 2) out.push(b[k] | (b[k + 1] << 8)); } return out; };

export function genUI(){
  let c = '';
  // BG: 0 vuoto, 1 fondo finestra, 2-9 cornice (TL, T, TR, L, R, BL, B, BR)
  const bg = new Img(80, 8);
  bg.rect(8, 0, 8, 8, 1);
  const frame = { TL:['..3333', '.34444', '341111', '341111', '341111', '341111'], };
  const draw = (slot, rows)=>bg.grid(rows, { 1:1, 3:3, 4:4 }, slot * 8, 0);
  // bordo spesso due pixel, arrotondato agli angoli
  draw(2, ['..333333', '.3444444', '34411111', '34111111', '34111111', '34111111', '34111111', '34111111']);
  draw(3, ['33333333', '44444444', '11111111', '11111111', '11111111', '11111111', '11111111', '11111111']);
  draw(4, ['333333..', '4444443.', '11111443', '11111143', '11111143', '11111143', '11111143', '11111143']);
  draw(5, ['34111111', '34111111', '34111111', '34111111', '34111111', '34111111', '34111111', '34111111']);
  draw(6, ['11111143', '11111143', '11111143', '11111143', '11111143', '11111143', '11111143', '11111143']);
  draw(7, ['34111111', '34111111', '34111111', '34111111', '34111111', '34411111', '.3444444', '..333333']);
  draw(8, ['11111111', '11111111', '11111111', '11111111', '11111111', '11111111', '44444444', '33333333']);
  draw(9, ['11111143', '11111143', '11111143', '11111143', '11111143', '11111443', '4444443.', '333333..']);
  c += cArray('u16', 'UI_TILES', tilesOf(bg, 10, 1), 16) + 'const u16 UI_NTILES = 10;\n';

  // OBJ: 0 cursore, 1 freccia giù, 2 stella, 3-10 frecce bussola (N, NE, E, SE, S, SO, O, NO), 11 punto esclamativo,
  // 12-15 forziere chiuso (16x16), 16-19 forziere aperto, 20 ombra
  const ob = new Img(8 * 21, 8);
  const O = { O:1, Y:2, y:3, W:4, R:5, B:6, b:7, G:8, g:9, K:10, S:11 };
  const put = (slot, rows, oy=0)=>ob.grid(rows, O, slot * 8, oy);
  put(0, ['O.......', 'OYO.....', 'OYYO....', 'OYYYO...', 'OYYyO...', 'OYyO....', 'OyO.....', 'O.......']);
  put(1, ['........', 'OOOOOOO.', 'OYYYYYO.', '.OYYYO..', '..OyO...', '...O....', '........', '........']);
  put(2, ['...O....', '..OYO...', 'OOOYOOO.', 'OYYYYYO.', '.OYYYO..', '.OYOYO..', 'OYO.OYO.', 'OO...OO.']);
  // frecce della bussola dell'obiettivo
  const arrows = [
    ['...O....', '..OYO...', '.OYYYO..', 'OYYYYYO.', 'OOOYOOO.', '..OYO...', '..OYO...', '..OOO...'],
    ['..OOOOO.', '...OYYO.', '...OYYO.', '..OYYYO.', '.OYYOYO.', 'OYYO.OO.', 'OYO.....', 'OO......'],
    ['...O....', '...OO...', 'OOOOYO..', 'OYYYYYO.', 'OYYYYYO.', 'OOOOYO..', '...OO...', '...O....'],
    ['OO......', 'OYO.....', 'OYYO.OO.', '.OYYOYO.', '..OYYYO.', '...OYYO.', '...OYYO.', '..OOOOO.'],
    ['..OOO...', '..OYO...', '..OYO...', 'OOOYOOO.', 'OYYYYYO.', '.OYYYO..', '..OYO...', '...O....'],
    ['......OO', '.....OYO', '.OO.OYYO', '.OYOYYO.', '.OYYYO..', '.OYYO...', '.OYYO...', '.OOOOO..'],
    ['....O...', '...OO...', '..OYOOOO', '.OYYYYYO', '.OYYYYYO', '..OYOOOO', '...OO...', '....O...'],
    ['.OOOOO..', '.OYYO...', '.OYYO...', '.OYYYO..', '.OYOYYO.', '.OO.OYYO', '.....OYO', '......OO'],
  ];
  arrows.forEach((a, i)=>put(3 + i, a));
  put(11, ['...OO...', '..OYYO..', '..OYYO..', '..OYYO..', '...OO...', '...OO...', '..OYYO..', '...OO...']);
  const chest = (open)=>{
    const img = new Img(16, 16);
    img.grid(open ? ['................', '................', '..OOOOOOOOOOOO..', '.ObbbbbbbbbbbbO.', '.OOOOOOOOOOOOOO.', '.OKKKKKKKKKKKKO.', '.OKWWYYWWYYWWKO.', '.OOOOOOOOOOOOOO.', '.OBBBBBYYBBBBBO.', '.OBbbbbYYbbbbBO.', '.OBBBBBBBBBBBBO.', '.OBbbbbbbbbbbBO.', '.OBBBBBBBBBBBBO.', '.OOOOOOOOOOOOOO.', '................', '................']
      : ['................', '................', '..OOOOOOOOOOOO..', '.OBBBBBBBBBBBBO.', '.OBbbbbbbbbbbBO.', '.OBBBBBBBBBBBBO.', '.OYYYYYOOYYYYYO.', '.OOOOOOYYOOOOOO.', '.OBBBBBYYBBBBBO.', '.OBbbbbOObbbbBO.', '.OBBBBBBBBBBBBO.', '.OBbbbbbbbbbbBO.', '.OBBBBBBBBBBBBO.', '.OOOOOOOOOOOOOO.', '................', '................'], O);
    return img;
  };
  const cc = chest(false), co = chest(true);
  [[0, 0], [8, 0], [0, 8], [8, 8]].forEach(([x, y], k)=>{ for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++){ ob.set((12 + k) * 8 + i, j, cc.get(x + i, y + j)); ob.set((16 + k) * 8 + i, j, co.get(x + i, y + j)); } });
  put(20, ['........', '........', '........', '........', '..SSSS..', '.SSSSSS.', '..SSSS..', '........']);
  c += cArray('u16', 'OBJ_UI_TILES', tilesOf(ob, 21, 1), 16);
  // i forzieri stanno meglio in ordine 1D: tile 12,13 (sopra) e 14,15 (sotto) già consecutivi
  const pal = ['#000000', '#201818', '#f8e060', '#c89020', '#f8f8f8', '#e04848', '#9c6034', '#6c3c1c', '#58c058', '#308030', '#c8a040', '#20202880'].map(h=>hex(h.slice(0, 7)));
  while (pal.length < 16) pal.push([0, 0, 0]);
  c += cArray('u16', 'OBJ_UI_PAL', pal.map(rgb15));
  return c;
}

// ---------- sfondi di battaglia: cielo, orizzonte della zona, prato con le "piattaforme" ----------
const BACKS = [
  { name:'varese',      sky:['#88c8f8', '#b8e0f8'], far:'#88a8c8', near:'#58a048', ground:['#78c058', '#58a040'], plat:'#a8d878', feat:'hills' },
  { name:'vedano',      sky:['#70b0e0', '#a8d8f0'], far:'#2c6030', near:'#3c7c38', ground:['#5aa040', '#3c8030'], plat:'#88c060', feat:'woods' },
  { name:'castiglione', sky:['#584878', '#c888a0'], far:'#46405a', near:'#686080', ground:['#807868', '#605848'], plat:'#a89880', feat:'ruins' },
  { name:'jerago',      sky:['#e87848', '#f8c078'], far:'#704030', near:'#905838', ground:['#a08048', '#806038'], plat:'#c8a868', feat:'castle' },
  { name:'samarate',    sky:['#707888', '#a8b0b8'], far:'#505860', near:'#687078', ground:['#8c8c88', '#6c6c68'], plat:'#b0b0a8', feat:'hangar' },
  { name:'sacromonte',  sky:['#0c1030', '#302858'], far:'#1c1838', near:'#2c2448', ground:['#3c3458', '#2a2440'], plat:'#584c80', feat:'shrine' },
];
export function genBackdrops(){
  let c = '', defs = [];
  BACKS.forEach((b, bi)=>{
    const cols = [...new Set([b.sky[0], b.sky[1], b.far, b.near, b.ground[0], b.ground[1], b.plat, '#101018', '#f8f8f8'])];
    const K = h=>cols.indexOf(h) + 1;
    const img = new Img(240, 160);
    // cielo in due fasce con retinatura al confine
    for (let y = 0; y < 52; y++) for (let x = 0; x < 240; x++){ const t = y / 52; img.set(x, y, t < 0.45 ? K(b.sky[0]) : t > 0.6 ? K(b.sky[1]) : ((x + y) % 2 ? K(b.sky[0]) : K(b.sky[1]))); }
    if (b.feat === 'shrine') for (let i = 0; i < 40; i++) img.set((hash2(i, 1) * 240) | 0, (hash2(i, 2) * 40) | 0, K('#f8f8f8'));
    // orizzonte lontano con sagome della zona
    for (let x = 0; x < 240; x++){
      let hgt = 18 + Math.sin(x * 0.03 + bi) * 7 + Math.sin(x * 0.11) * 3;
      if (b.feat === 'woods') hgt = 20 + ((x * 7) % 13 < 6 ? 6 : 0) + Math.abs(((x % 12) - 6)) * -1.2 + 6;
      for (let y = 52 - hgt * 0.8; y < 52; y++) img.set(x, y | 0, K(b.far));
    }
    const shape = (x0, w, h, notch)=>{ h = h * 0.8 | 0; for (let x = x0; x < x0 + w; x++) for (let y = 52 - h; y < 52; y++) if (!(notch && y < 52 - h + 4 && ((x - x0) % 6) < 3)) img.set(x, y, K(b.near)); };
    if (b.feat === 'castle'){ shape(40, 26, 40, true); shape(66, 60, 26, true); shape(126, 22, 46, true); }
    if (b.feat === 'ruins'){ shape(20, 14, 30, true); shape(60, 10, 22, false); shape(150, 40, 34, true); shape(200, 12, 26, false); }
    if (b.feat === 'hangar') for (const x0 of [10, 90, 170]) for (let x = x0; x < x0 + 64; x++){ const h = 18 + Math.sqrt(Math.max(0, 32 * 32 - (x - x0 - 32) ** 2)) * 0.35; for (let y = 52 - h; y < 52; y++) img.set(x, y | 0, K(b.near)); }
    if (b.feat === 'shrine'){ shape(104, 32, 34, false); shape(114, 12, 48, false); }
    if (b.feat === 'hills') for (let x = 0; x < 240; x++){ const h = 8 + Math.sin(x * 0.05 + 2) * 5; for (let y = 52 - h; y < 52; y++) img.set(x, y | 0, K(b.near)); }
    // prato con righe di prospettiva
    for (let y = 52; y < 160; y++) for (let x = 0; x < 240; x++){ const band = ((y - 52) ** 1.3 / 6 | 0) % 2; img.set(x, y, band ? K(b.ground[0]) : K(b.ground[1])); }
    // piattaforme ellittiche: nemici a sinistra in alto, squadra a destra in basso (come in Pokémon)
    const plat = (cx, cy, rx, ry)=>{ for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++){ const d = (x / rx) ** 2 + (y / ry) ** 2; if (d <= 1) img.set(cx + x, cy + y, d > 0.8 ? K(b.ground[1]) : K(b.plat)); } };
    plat(72, 80, 62, 10); plat(182, 90, 54, 10);
    // tile senza doppioni
    const tiles = [], idx = new Map(), map = [];
    for (let ty = 0; ty < 20; ty++) for (let tx = 0; tx < 32; tx++){
      if (tx >= 30){ map.push(0); continue; }
      const t = img.tile4(tx, ty), k = Buffer.from(t).toString('hex');
      if (!idx.has(k)){ idx.set(k, tiles.length); tiles.push(t); }
      map.push(idx.get(k));
    }
    const pal = [[0, 0, 0], ...cols.map(hex)]; while (pal.length < 16) pal.push([0, 0, 0]);
    c += cArray('u16', `BACK_TILES_${bi}`, tiles.flatMap(t=>{ const o = []; for (let i = 0; i < 32; i += 2) o.push(t[i] | (t[i + 1] << 8)); return o; }), 16);
    c += cArray('u16', `BACK_MAP_${bi}`, map) + cArray('u16', `BACK_PAL_${bi}`, pal.map(rgb15));
    defs.push(`{ BACK_TILES_${bi}, ${tiles.length}, BACK_MAP_${bi}, BACK_PAL_${bi} }`);
  });
  c += `const Backdrop BACKDROPS[] = { ${defs.join(', ')} };\n`;
  return c;
}
