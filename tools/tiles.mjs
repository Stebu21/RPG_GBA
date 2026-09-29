// Tile 16x16 in pixel art GBA: tavolozze di 16 colori e un "pittore" per ogni tipo di casella.
import { Img, hex, hash2 } from './pixel.mjs';

// ---------- tavolozze BG (indice 0 = trasparente / colore di fondo) ----------
export const BG_PALS = {
  ui:      ['#000000', '#f8f8f8', '#d8e8f8', '#384058', '#78a0d8', '#484850', '#d0d0d8', '#e84848', '#48c060', '#4890e0', '#f8c840', '#b060e0', '#686878', '#c8d8f8', '#203058', '#ffffff'],
  outdoor: ['#000000', '#203018', '#a0e070', '#70b848', '#489030', '#286828', '#785030', '#f0e0b0', '#c8b078', '#d8d4c8', '#a8a090', '#686058', '#f8f8f8', '#e85050', '#f8e060', '#78a8e0'],
  build:   ['#000000', '#282028', '#f89068', '#d85838', '#983028', '#fcf0d8', '#e8cca0', '#b09070', '#b8e0f8', '#4878b8', '#9c6034', '#5c3418', '#d8d4cc', '#a09888', '#686058', '#f0c040'],
  water:   ['#000000', '#183050', '#98d8f8', '#58a8f0', '#3070c8', '#1c4c98', '#f8f8f8', '#a0e070', '#70b848', '#e8d8a0', '#b08850', '#704c28', '#489030', '#c8b078', '#d8f0ff', '#285828'],
  inside:  ['#000000', '#281c18', '#e0a868', '#b87c48', '#8c5430', '#f0e4c8', '#c8b490', '#c83c3c', '#f0c048', '#4870c8', '#f8f8f8', '#58a048', '#704098', '#a8a8b0', '#5c3c24', '#e8e0d0'],
  world:   ['#000000', '#1c2818', '#a0e070', '#70b848', '#489030', '#b8b0a0', '#8c8474', '#5c5448', '#f8f8f8', '#286828', '#f0e0b0', '#c8a870', '#58a8f0', '#3070c8', '#d85838', '#fcf0d8'],
  gundam:  ['#000000', '#202028', '#f8f8f8', '#c8c8d8', '#3868d8', '#203c98', '#d83838', '#f8d030', '#a8a8b0', '#68686e', '#70b848', '#489030', '#d8d4c8', '#a8a090', '#a0e070', '#606880'],
};
export const PAL_INDEX = Object.fromEntries(Object.keys(BG_PALS).map((k, i)=>[k, i]));
export const rgbPal = k=>BG_PALS[k].map(hex);

// scorciatoie colore per tavolozza (indice nel nome)
const O = { OL:1, GL:2, G:3, GD:4, TD:5, TR:6, PL:7, PD:8, SL:9, S:10, SD:11, W:12, RED:13, YEL:14, BLU:15 };
const B = { OL:1, RL:2, R:3, RD:4, WL:5, W:6, WD:7, GL:8, GW:9, DR:10, DRD:11, SL:12, S:13, SD:14, GO:15 };
const A = { OL:1, WL:2, W:3, WM:4, WD:5, FO:6, GL:7, G:8, SA:9, BL:10, BD:11, GD:12, SAD:13, SH:14, TD:15 };
const I = { OL:1, FL:2, F:3, FD:4, WL:5, W:6, RUG:7, GO:8, BL:9, WH:10, GR:11, PU:12, ME:13, DK:14, CR:15 };
const Wd = { OL:1, GL:2, G:3, GD:4, RL:5, R:6, RD:7, SN:8, TD:9, PL:10, PD:11, WL:12, WM:13, ROOF:14, WALL:15 };
const Gd = { OL:1, WH:2, WS:3, BL:4, BD:5, RE:6, YE:7, ME:8, MD:9, G:10, GD:11, SL:12, S:13, GL:14, DK:15 };

// ---------- pittori ----------
const T = {}; // nome -> { pal, draw(img, cx, cy) } dove (cx, cy) è la casella nella mappa (per la variazione)

function grass(img, cx, cy, tall=false){
  img.rect(0, 0, 16, 16, O.G);
  for (let i = 0; i < 16; i++){ const x = (hash2(cx, cy, i) * 16) | 0, y = (hash2(cx, cy, i + 40) * 16) | 0; img.set(x, y, O.GL); if (hash2(cx, cy, i + 80) < 0.4) img.set(x, y + 1, O.GD); }
  if (tall){
    // erba alta: ciuffi a V fitti, stile Pokémon
    for (let k = 0; k < 4; k++){ const ox = (k % 2) * 8, oy = (k >> 1) * 8;
      for (const [x, y, c] of [[1,5,O.GD],[2,4,O.GD],[3,3,O.GL],[4,4,O.GD],[5,5,O.GD],[2,6,O.GD],[3,5,O.G],[4,6,O.GD],[5,2,O.GL],[6,3,O.GD],[1,2,O.GL],[0,3,O.GD]]) img.set(ox + x, oy + y, c);
      img.rect(ox + 1, oy + 7, 6, 1, O.GD); }
  }
}
T.grass = { pal:'outdoor', draw:(i, x, y)=>grass(i, x, y) };
T.tallgrass = { pal:'outdoor', draw:(i, x, y)=>grass(i, x, y, true) };
T.flowers = { pal:'outdoor', draw:(i, x, y)=>{ grass(i, x, y);
  for (let k = 0; k < 4; k++){ const fx = 2 + (k % 2) * 8 + ((hash2(x, y, k) * 3) | 0), fy = 2 + (k >> 1) * 8 + ((hash2(x, y, k + 9) * 3) | 0), c = hash2(x, y, k + 3) < 0.5 ? O.RED : O.YEL;
    i.set(fx, fy - 1, c); i.set(fx - 1, fy, c); i.set(fx + 1, fy, c); i.set(fx, fy + 1, c); i.set(fx, fy, O.W); i.set(fx, fy + 2, O.GD); } } };
T.path = { pal:'outdoor', draw:(i, x, y)=>{ i.rect(0, 0, 16, 16, O.PL); for (let k = 0; k < 10; k++) i.set((hash2(x, y, k) * 16) | 0, (hash2(x, y, k + 20) * 16) | 0, O.PD); } };
// pavé a cubetti: mattonelle sfalsate
T.paving = { pal:'outdoor', draw:(i, x, y)=>{ i.rect(0, 0, 16, 16, O.SL);
  for (let r = 0; r < 4; r++){ i.rect(0, r * 4 + 3, 16, 1, O.S); const off = (r % 2) * 2; for (let c = 0; c < 4; c++) i.set(off + c * 4 + 3, r * 4, O.S), i.set(off + c * 4 + 3, r * 4 + 1, O.S), i.set(off + c * 4 + 3, r * 4 + 2, O.S); }
  if (hash2(x, y, 5) < 0.3) i.set(5, 6, O.SD); } };
// strada asfaltata con striscia
T.road = { pal:'outdoor', draw:(i, x, y)=>{ i.rect(0, 0, 16, 16, O.S); for (let k = 0; k < 14; k++) i.set((hash2(x, y, k) * 16) | 0, (hash2(x, y, k + 30) * 16) | 0, hash2(x, y, k + 60) < 0.5 ? O.SD : O.SL); } };
// albero: chioma tonda con contorno scuro e luci, tronco sotto
T.tree = { pal:'outdoor', draw:(i, x, y)=>{ grass(i, x, y);
  i.grid(['.....OOOOOO.....', '...OOdddmmdOO...', '..OddmmmllmmdO..', '.OddmmmlllmmmdO.', '.OdmmmmmllmmmdO.', 'OddmmmmmmmmmmddO', 'OdmmlmmmmmmmmmdO', 'OddmmmmmmmlmmddO', 'OdddmmmmmmmmdddO', '.OdddmmmmmmdddO.', '..OOddddddddOO..', '....OOOttOOO....', '......OttO......', '......OttO......', '.....OttttO.....', '....bbbbbbbb....'],
    { O:O.OL, d:O.TD, m:O.GD, l:O.G, t:O.TR, b:O.GD }); } };
T.hedge = { pal:'outdoor', draw:(i, x, y)=>{ grass(i, x, y); i.grid(['................', '................', '.OOOOOOOOOOOOOO.', 'OdmmmlmmmmlmmmdO', 'OmmlmmmmlmmmmlmO', 'OdmmmmlmmmmlmmdO', 'OddmmmmmmmmmmddO', '.OddddddddddddO.', '..OOOOOOOOOOOO..', '................'].concat(Array(6).fill('................')), { O:O.OL, d:O.TD, m:O.GD, l:O.G }); } };
T.lamp = { pal:'outdoor', draw:(i, x, y)=>{ grass(i, x, y); i.grid(['......OOOO......', '.....OYYYYO.....', '.....OYWWYO.....', '......OOOO......', '.......OO.......', '.......OO.......', '.......OO.......', '.......OO.......', '.......OO.......', '.......OO.......', '.......OO.......', '.......OO.......', '......OOOO......', '.....bbbbbb.....'], { O:O.SD, Y:O.YEL, W:O.W, b:O.GD }); } };
T.bench = { pal:'outdoor', draw:(i, x, y)=>{ T.paving.draw(i, x, y); i.grid(['................', '................', '................', '................', '..OOOOOOOOOOOO..', '..OttttttttttO..', '..OOOOOOOOOOOO..', '..OttttttttttO..', '..OOOOOOOOOOOO..', '..O.O......O.O..', '..O.O......O.O..', '................'], { O:O.OL, t:O.TR }); } };
T.fountain = { pal:'outdoor', draw:(i, x, y)=>{ T.paving.draw(i, x, y); i.grid(['......OOOO......', '.....OBWWBO.....', '......OBBO......', '...OOOOSSOOOO...', '..OSSSSSSSSSSO..', '.OSBBBBBBBBBBSO.', '.OSBBWBBBBWBBSO.', '.OSBBBBBBBBBBSO.', '.OSSBBBBBBBBSSO.', '..OSSSSSSSSSSO..', '...OOOOOOOOOO...'], { O:O.SD, S:O.SL, B:O.BLU, W:O.W }); } };
T.statue = { pal:'outdoor', draw:(i, x, y)=>{ T.paving.draw(i, x, y); i.grid(['......OOO.......', '.....OSSSO......', '.....OSSSO......', '......OSO.......', '....OOSSSOO.....', '...OSSSSSSSO....', '...OSOSSSOSO....', '.....OSSSO......', '.....OSOSO......', '....OSSOSSO.....', '...OOOOOOOOO....', '...OSSSSSSSO....', '...OOOOOOOOO....'], { O:O.SD, S:O.SL }); } };
T.market = { pal:'build', draw:(i, x, y)=>{ i.rect(0, 0, 16, 16, B.SL); i.grid(['OOOOOOOOOOOOOOOO', 'RWRWRWRWRWRWRWRW', 'RWRWRWRWRWRWRWRW', 'OOOOOOOOOOOOOOOO', '.O............O.', '.O............O.', '.O............O.', 'OOOOOOOOOOOOOOOO', 'OddGGddYYddGGddO', 'OddddddddddddddO', 'OOOOOOOOOOOOOOOO', '.O............O.'], { O:B.OL, R:B.R, W:B.WL, d:B.DR, G:B.GL, Y:B.GO }); } };
// montagna / rocce (Castiglione, Sacro Monte): pendio erboso con massi
T.rock = { pal:'outdoor', draw:(i, x, y)=>{ grass(i, x, y); i.grid(['................', '.....OOOOO......', '...OOSSSSSOO....', '..OSSLLSSSSSO...', '.OSLLSSSSSSSSO..', '.OSSSSSSSSDSSO..', 'OSSSSSSSDDSSSSO.', 'OSSSSSSSSSSSDSO.', 'OSDSSSSSSSSSSSOO', '.OSSSSDDSSSSSSSO', '.OOSSSSSSSSSSDO.', '...OOOOOOOOOOO..'], { O:O.OL, S:O.S, L:O.SL, D:O.SD }, 0, 2); } };
T.void = { pal:'outdoor', draw:(i)=>i.rect(0, 0, 16, 16, O.OL) };

// ---------- acqua con rive (4 bit: acqua a N, E, S, O) ----------
function water(i, x, y, frame=0){
  i.rect(0, 0, 16, 16, A.W);
  for (let r = 0; r < 16; r += 4) for (let c = 0; c < 16; c++){ const yy = r + Math.round(Math.sin((c + frame * 2 + r) * 0.8) * 1) + 1; if ((c + r + frame) % 7 < 3) i.set(c, yy, A.WL); }
  if (hash2(x, y, 1) < 0.5) i.set(6, 9, A.FO);
}
for (let m = 0; m < 16; m++) for (const f of [0, 1]){
  T[`water${m}_${f}`] = { pal:'water', draw:(i, x, y)=>{
    water(i, x, y, f);
    // rive d'erba dove il vicino non è acqua (bit: 1 N, 2 E, 4 S, 8 O = vicino d'acqua)
    const shore = (dx0, dy0, w, h)=>{ i.rect(dx0, dy0, w, h, A.G); };
    if (!(m & 1)){ shore(0, 0, 16, 2); i.rect(0, 2, 16, 1, A.SA); }
    if (!(m & 4)){ i.rect(0, 13, 16, 1, A.SA); shore(0, 14, 16, 2); }
    if (!(m & 8)){ shore(0, 0, 2, 16); i.rect(2, 0, 1, 16, A.SA); }
    if (!(m & 2)){ i.rect(13, 0, 1, 16, A.SA); shore(14, 0, 2, 16); }
  } };
}
T.bridge = { pal:'water', draw:(i, x, y)=>{ water(i, x, y); i.rect(0, 1, 16, 14, A.BL); for (let k = 0; k < 16; k += 4) i.rect(k, 1, 1, 14, A.BD); i.rect(0, 0, 16, 1, A.OL); i.rect(0, 15, 16, 1, A.OL); i.rect(0, 2, 16, 1, A.SH); } };

// ---------- edifici: tetto (in alto), facciata (in basso), con estremità sinistra/destra ----------
function roof(i, x, y, side, church=false){
  const R1 = church ? B.SL : B.RL, R2 = church ? B.S : B.R, R3 = church ? B.SD : B.RD;
  i.rect(0, 0, 16, 16, R2);
  for (let r = 0; r < 16; r += 4){ i.rect(0, r, 16, 1, R3); for (let c = (r / 4) % 2 * 4; c < 16; c += 8) i.rect(c, r + 1, 1, 3, R3); i.rect(0, r + 1, 16, 1, R1); }
  i.rect(0, 15, 16, 1, B.OL);
  if (side & 1){ i.rect(0, 0, 1, 16, B.OL); i.rect(1, 0, 1, 15, R1); }
  if (side & 2){ i.rect(15, 0, 1, 16, B.OL); i.rect(14, 0, 1, 15, R3); }
}
function facade(i, x, y, side, kind){
  i.rect(0, 0, 16, 16, B.W);
  i.rect(0, 0, 16, 2, B.WD); i.rect(0, 14, 16, 2, B.S); i.rect(0, 15, 16, 1, B.SD);
  if (side & 1){ i.rect(0, 0, 1, 16, B.OL); i.rect(1, 2, 1, 12, B.WL); }
  if (side & 2){ i.rect(15, 0, 1, 16, B.OL); i.rect(14, 2, 1, 12, B.WD); }
  if (kind === 'window'){
    i.grid(['....OOOOOOOO....', '..gOLLLLLLLLOg..', '..gOLWWLLWWLOg..', '..gOLWLLLWLLOg..', '..gOWWWLWWWWOg..', '..gOWWWLWWWWOg..', '..gOOOOOOOOOOg..', '...SSSSSSSSSS...'], { O:B.OL, L:B.GL, W:B.GW, g:B.GL, S:B.SL }, 0, 4);
    // persiane verdi del varesotto: qui in tinta legno
    i.rect(2, 5, 1, 6, B.DR); i.rect(13, 5, 1, 6, B.DR);
  } else if (kind === 'door'){
    i.grid(['....OOOOOOOO....', '...OddddddddO...', '...OdDDddDDdO...', '...OdDDddDDdO...', '...OddddddddO...', '...OdDDddDDdO...', '...OdDDddgDDO...', '...OdDDddDDdO...', '...OddddddddO...', '...OddddddddO...', '..SSSSSSSSSSSS..', '..OOOOOOOOOOOO..'], { O:B.OL, d:B.DR, D:B.DRD, g:B.GO, S:B.SL }, 0, 4);
  }
}
for (const side of [0, 1, 2, 3]){
  T[`roof${side}`] = { pal:'build', draw:(i, x, y)=>roof(i, x, y, side) };
  T[`croof${side}`] = { pal:'build', draw:(i, x, y)=>roof(i, x, y, side, true) };
  T[`wall${side}`] = { pal:'build', draw:(i, x, y)=>facade(i, x, y, side, 'plain') };
  T[`win${side}`] = { pal:'build', draw:(i, x, y)=>facade(i, x, y, side, 'window') };
  T[`door${side}`] = { pal:'build', draw:(i, x, y)=>facade(i, x, y, side, 'door') };
}
// chiesa: facciata di pietra chiara con rosone e croce
T.church = { pal:'build', draw:(i, x, y)=>{ i.rect(0, 0, 16, 16, B.SL); i.rect(0, 0, 16, 1, B.OL); i.rect(0, 15, 16, 1, B.SD);
  i.grid(['.......GG.......', '.....GGGGGG.....', '.......GG.......', '.......GG.......', '.....OOOOOO.....', '....OLLLLLLO....', '...OLWLLLLWLO...', '...OLLWLLWLLO...', '...OLLLWWLLLO...', '...OLLWLLWLLO...', '....OLLLLLLO....', '.....OOOOOO.....'], { O:B.OL, G:B.GO, L:B.GL, W:B.GW }, 0, 2); } };
// torre / campanile / torre del castello: merli in cima
T.tower = { pal:'build', draw:(i, x, y)=>{ i.rect(0, 0, 16, 16, B.S); i.grid(['OOO.OOOO.OOOO.OO', 'OSO.OSSO.OSSO.OO', 'OSOOOSSOOOSSOOSO', 'OSSSSSSSSSSSSSSO', 'OOOOOOOOOOOOOOOO'], { O:B.OL, S:B.SL }); for (let r = 6; r < 16; r += 3) i.rect(1, r, 14, 1, B.SD); i.rect(6, 8, 4, 5, B.OL); i.rect(7, 9, 2, 4, B.GW); i.rect(0, 0, 1, 16, B.OL); i.rect(15, 0, 1, 16, B.OL); } };
// ingresso dell'Accademia / Sacro Monte: portale ad arco
function gate(i, gold){ i.rect(0, 0, 16, 16, B.SL); i.grid(['OOOOOOOOOOOOOOOO', 'OSGSGSGSGSGSGSGO', 'OOOOOOOOOOOOOOOO', 'OSS...OOOO...SSO', 'OSS..ODDDDO..SSO', 'OSS.ODDDDDDO.SSO', 'OSS.ODDDDDDO.SSO', 'OSS.ODDDDDDO.SSO', 'OSS.ODDgDDDO.SSO', 'OSS.ODDDDDDO.SSO', 'OSS.ODDDDDDO.SSO', 'OSS.ODDDDDDO.SSO', 'OSSOOOOOOOOOOSSO', 'OSSSSSSSSSSSSSSO', 'OOOOOOOOOOOOOOOO'], { O:B.OL, S:B.S, G:gold ? B.GO : B.SD, D:B.DRD, g:B.GO }); }
T.gate = { pal:'build', draw:i=>gate(i, true) };
T.stoneblock = { pal:'build', draw:i=>{ i.rect(0, 0, 16, 16, B.S); for (let r = 0; r < 16; r += 4){ i.rect(0, r, 16, 1, B.SD); for (let c = (r / 4 % 2) * 4; c < 16; c += 8) i.rect(c, r, 1, 4, B.SD); } } };

// ---------- interni ----------
T.floor = { pal:'inside', draw:(i, x, y)=>{ i.rect(0, 0, 16, 16, I.F); for (let r = 0; r < 16; r += 4){ i.rect(0, r + 3, 16, 1, I.FD); i.rect(((x * 5 + r) % 16), r, 1, 3, I.FD); } for (let k = 0; k < 4; k++) i.set((hash2(x, y, k) * 16) | 0, (hash2(x, y, k + 7) * 16) | 0, I.FL); } };
T.iwall = { pal:'inside', draw:(i, x, y)=>{ i.rect(0, 0, 16, 16, I.W); i.rect(0, 0, 16, 10, I.WL); for (let c = 0; c < 16; c += 4) i.rect(c, 0, 1, 10, I.W); i.rect(0, 10, 16, 2, I.FD); i.rect(0, 12, 16, 4, I.W); i.rect(0, 15, 16, 1, I.OL); } };
T.iwalltop = { pal:'inside', draw:i=>{ i.rect(0, 0, 16, 16, I.DK); i.rect(0, 14, 16, 2, I.OL); } };
T.shelf = { pal:'inside', draw:(i, x, y)=>{ T.iwall.draw(i, x, y); i.grid(['OOOOOOOOOOOOOOOO', 'OdRBGdPRBdGPRBdO', 'OdRBGdPRBdGPRBdO', 'OOOOOOOOOOOOOOOO', 'OdGPdRBGdPRdBGdO', 'OdGPdRBGdPRdBGdO', 'OOOOOOOOOOOOOOOO', 'OddddddddddddddO', 'OOOOOOOOOOOOOOOO'], { O:I.OL, d:I.FD, R:I.RUG, B:I.BL, G:I.GR, P:I.PU }, 0, 2); } };
T.bed = { pal:'inside', draw:(i, x, y)=>{ T.floor.draw(i, x, y); i.grid(['.OOOOOOOOOOOOOO.', '.OddddddddddddO.', '.OWWWWWWWWWWWWO.', '.OWWWWWWWWWWWWO.', '.OBBBBBBBBBBBBO.', '.OBbBBBBBBBBbBO.', '.OBBBBBBBBBBBBO.', '.OBBBBBBBBBBBBO.', '.OBBBBbBBBBBBBO.', '.OBBBBBBBBBBBBO.', '.OddddddddddddO.', '.OOOOOOOOOOOOOO.'], { O:I.OL, d:I.FD, W:I.WH, B:I.BL, b:I.ME }, 0, 2); } };
T.table = { pal:'inside', draw:(i, x, y)=>{ T.floor.draw(i, x, y); i.grid(['................', '..OOOOOOOOOOOO..', '.OLLLLLLLLLLLLO.', '.OLLLLLGLLLLLLO.', '.OLLLLGYGLLLLLO.', '.OLLLLLGLLLLLLO.', '.OddddddddddddO.', '.OOOOOOOOOOOOOO.', '..Od........dO..', '..Od........dO..', '..OO........OO..'], { O:I.OL, L:I.FL, d:I.FD, G:I.GO, Y:I.WH }, 0, 2); } };
T.counter = { pal:'inside', draw:(i, x, y)=>{ T.floor.draw(i, x, y); i.grid(['OOOOOOOOOOOOOOOO', 'OCCCCCCCCCCCCCCO', 'OOOOOOOOOOOOOOOO', 'OddddddddddddddO', 'OdDDDdDDDdDDDddO', 'OdDDDdDDDdDDDddO', 'OddddddddddddddO', 'OdDDDdDDDdDDDddO', 'OdDDDdDDDdDDDddO', 'OddddddddddddddO', 'OOOOOOOOOOOOOOOO'], { O:I.OL, C:I.CR, d:I.F, D:I.FD }, 0, 3); } };
T.rug = { pal:'inside', draw:(i, x, y)=>{ T.floor.draw(i, x, y); i.rect(1, 1, 14, 14, I.RUG); i.rect(1, 1, 14, 1, I.GO); i.rect(1, 14, 14, 1, I.GO); i.rect(1, 1, 1, 14, I.GO); i.rect(14, 1, 1, 14, I.GO); } };
T.altar = { pal:'inside', draw:(i, x, y)=>{ T.floor.draw(i, x, y); i.grid(['.......GG.......', '.....GGGGGG.....', '.......GG.......', '.......GG.......', '..OOOOOOOOOOOO..', '.OWWWWWWWWWWWWO.', '.OWWWGWWWWGWWWO.', '.OWWWWWWWWWWWWO.', '.OCCCCCCCCCCCCO.', '.OCCCCCCCCCCCCO.', '.OOOOOOOOOOOOOO.'], { O:I.OL, G:I.GO, W:I.WH, C:I.CR }, 0, 2); } };

// ---------- mappa del mondo ----------
function wgrass(i, x, y){ i.rect(0, 0, 16, 16, Wd.G); for (let k = 0; k < 10; k++) i.set((hash2(x, y, k) * 16) | 0, (hash2(x, y, k + 11) * 16) | 0, hash2(x, y, k + 2) < 0.5 ? Wd.GL : Wd.GD); }
T.wgrass = { pal:'world', draw:(i, x, y)=>wgrass(i, x, y) };
T.wtall = { pal:'world', draw:(i, x, y)=>{ wgrass(i, x, y); for (let k = 0; k < 4; k++){ const ox = (k % 2) * 8, oy = (k >> 1) * 8; i.grid(['........', '.d...d..', 'dLd.dLd.', '.d.d.d..', '...dLd..', '....d...'], { d:Wd.GD, L:Wd.GL }, ox, oy + 1); } } };
T.wtree = { pal:'world', draw:(i, x, y)=>{ wgrass(i, x, y); i.grid(['....OOO.........', '...OdmdO...OOO..', '..OdmmmdO.OdmdO.', '..OdmmmdOOdmmmdO', '...OdddO.OdmmmdO', '....OtO...OdddO.', '....OtO....OtO..', '...........OtO..', '...OOO..........', '..OdmdO.........', '.OdmmmdO..OOO...', '.OdmmmdO.OdmdO..', '..OdddO.OdmmmdO.', '...OtO..OdmmmdO.', '...OtO...OdddO..', '..........OtO...'], { O:Wd.OL, d:Wd.TD, m:Wd.GD, t:Wd.RD }); } };
T.wmount = { pal:'world', draw:(i, x, y)=>{ wgrass(i, x, y); i.grid(['.......OO.......', '......OSSO......', '.....OSSSLO.....', '.....OSLLLO.....', '....OLLLLDLO....', '....OLLDLLDLO...', '...OLLLLDLLLO...', '...OLDLLLLDLLO..', '..OLLLLLDLLLLO..', '..OLLDLLLLLDLLO.', '.OLLLLLLDLLLLLO.', '.ODLLDLLLLLDLLDO', 'OLLLLLLDLLLLLLLO', 'ODDDDDDDDDDDDDDO', 'OOOOOOOOOOOOOOOO'], { O:Wd.OL, S:Wd.SN, L:Wd.RL, D:Wd.R }); } };
T.wroad = { pal:'world', draw:(i, x, y)=>{ i.rect(0, 0, 16, 16, Wd.PL); for (let k = 0; k < 8; k++) i.set((hash2(x, y, k) * 16) | 0, (hash2(x, y, k + 5) * 16) | 0, Wd.PD); } };
T.wwater = { pal:'world', draw:(i, x, y)=>{ i.rect(0, 0, 16, 16, Wd.WM); for (let r = 1; r < 16; r += 5) for (let c = (r % 3); c < 16; c += 6) i.rect(c, r, 3, 1, Wd.WL); } };
T.wbridge = { pal:'world', draw:(i, x, y)=>{ T.wwater.draw(i, x, y); i.rect(0, 2, 16, 12, Wd.PD); for (let k = 0; k < 16; k += 3) i.rect(k, 2, 1, 12, Wd.RD); i.rect(0, 2, 16, 1, Wd.OL); i.rect(0, 13, 16, 1, Wd.OL); } };
// paese sulla mappa: tre casette rosse
T.wtown = { pal:'world', draw:(i, x, y)=>{ wgrass(i, x, y); i.grid(['................', '..OOOO....OOOO..', '.ORRRRO..ORRRRO.', 'ORRRRRRO.RRRRRRO', 'OOOOOOOOOOOOOOOO', '.OWWWWO..OWWWWO.', '.OWOOWO..OWOOWO.', '.OOOOOO..OOOOOO.', '.....OOOOO......', '....ORRRRRO.....', '...ORRRRRRRO....', '...OOOOOOOOO....', '....OWWWWWO.....', '....OWWOWWO.....', '....OOOOOOO.....'], { O:Wd.OL, R:Wd.ROOF, W:Wd.WALL }); } };
T.wshrine = { pal:'world', draw:(i, x, y)=>{ T.wmount.draw(i, x, y); i.grid(['.......S........', '......SSS.......', '.....OOOOO......', '....OWWWWWO.....', '....OWOWOWO.....', '....OOOOOOO.....'], { O:Wd.OL, S:Wd.SN, W:Wd.WALL }, 0, 5); } };

// ---------- statua del Gundam (Vedano, parco) ----------
T.gundam = { pal:'gundam', draw:(i, x, y)=>{ i.rect(0, 0, 16, 16, Gd.G); i.grid(['......OYYO......', '....OOWWWWOO....', '...OWWYRRYWWO...', '..OBBOWWWWOBBO..', '.OBBBOBBBBOBBBO.', '.OWWOBBBBBBOWWO.', '.OWWOBBYYBBOWWO.', '..OO.ORRRRO.OO..', '.....OWWWWO.....', '....OWWO.OWWO...', '....OBBO.OBBO...', '...OBBBO.OBBBO..', '..OSSSSSSSSSSSO.', '..OSSSSSSSSSSSO.', '..OOOOOOOOOOOOO.'], { O:Gd.OL, W:Gd.WH, B:Gd.BL, R:Gd.RE, Y:Gd.YE, S:Gd.S }); } };

export const TILES = T;
