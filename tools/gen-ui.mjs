// Interfaccia (cornici, cursori, frecce, forzieri) e sfondi di battaglia per zona.
import { Img, hex, rgb15, cArray, hash2 } from './pixel.mjs';
import { paintBattleBack, BATTLE_BACKS } from './battlebg.mjs';
import { convertLayers } from './gba-convert.mjs';

const tilesOf = (img, tw, th)=>{ const out = []; for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++){ const b = img.tile4(tx, ty); for (let k = 0; k < 32; k += 2) out.push(b[k] | (b[k + 1] << 8)); } return out; };

export function genUI(){
  let c = '';
  // BG: 0 vuoto, 1 fondo finestra, 2-9 cornice (TL, T, TR, L, R, BL, B, BR)
  const bg = new Img(80, 8);
  bg.rect(8, 0, 8, 8, 1);
  const frame = { TL:['..3333', '.34444', '341111', '341111', '341111', '341111'], };
  const draw = (slot, rows)=>bg.grid(rows, { 1:1, 2:2, 3:3, 4:4 }, slot * 8, 0);
  // cornice spessa quattro pixel (contorno, due di azzurro, filo chiaro), angoli arrotondati
  const TL = ['...33333', '.3344444', '.3444444', '34422222', '34421111', '34421111', '34421111', '34421111'];
  const T = ['33333333', '44444444', '44444444', '22222222', '11111111', '11111111', '11111111', '11111111'];
  const L = Array(8).fill('34421111');
  const hf = r=>r.map(x=>[...x].reverse().join('')), vf = r=>r.slice().reverse();
  draw(2, TL); draw(3, T); draw(4, hf(TL)); draw(5, L); draw(6, hf(L)); draw(7, vf(TL)); draw(8, vf(T)); draw(9, vf(hf(TL)));
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

// ---------- sfondi di battaglia: disegnati a colori pieni (battlebg.mjs), tavolozze BG 8..14 ----------
export function genBackdrops(){
  let c = '', defs = [];
  BATTLE_BACKS.forEach((b, bi)=>{
    const img = paintBattleBack(b, bi);
    const r = convertLayers([{ f0:img, f1:null }], 240, 160, { name:'battaglia ' + b.name, maxPals:7, maxTiles:1000 });
    // schermata 32x20: righe di 30 tile più due vuote; tavolozze spostate da 1.. a 8..
    const map = [];
    for (let ty = 0; ty < 20; ty++) for (let tx = 0; tx < 32; tx++) map.push(tx < 30 ? (r.maps[0][ty * 30 + tx] & 0x0FFF) | ((((r.maps[0][ty * 30 + tx] >> 12) || 1) + 7) << 12) : 0);
    c += cArray('u16', `BACK_TILES_${bi}`, r.tiles, 16);
    c += cArray('u16', `BACK_MAP_${bi}`, map) + cArray('u16', `BACK_PAL_${bi}`, r.pals.flatMap(p=>{ const o = [...p]; while (o.length < 16) o.push(0); return o; }));
    defs.push(`{ BACK_TILES_${bi}, ${r.ntiles}, BACK_MAP_${bi}, BACK_PAL_${bi}, ${r.pals.length} }`);
    console.log('sfondo', b.name, r.ntiles, 'tile', r.pals.length, 'tavolozze');
  });
  c += `const Backdrop BACKDROPS[] = { ${defs.join(', ')} };
`;
  return c;
}
