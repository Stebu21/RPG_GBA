// Mappe disegnate come un'unica immagine (stile Pokémon Rubino/Zaffiro): terreni con bordi morbidi,
// alberi alti due caselle, case con tetto e facciata, chiese, acqua animata, rocce, interni arredati.
// Ogni mappa ha due livelli: "ground" (BG1, sotto gli sprite) e "top" (BG2, sopra gli sprite: tetti e
// chiome che coprono chi ci passa dietro). La conversione in tile e tavolozze GBA è in gba-convert.mjs.
import { hash2 } from './pixel.mjs';

// ---------- colori (0xRRGGBB) ----------
const H = s=>parseInt(s.slice(1), 16);
const C = {};
const def = (name, list)=>{ list.forEach((h, i)=>{ C[name + i] = H(h); }); };
def('g', ['#c8f0a0', '#a0e080', '#80c868', '#60b058', '#44904c', '#2c6c3c']);          // erba
def('tg', ['#88d060', '#58a848', '#3c8440', '#26603a', '#184430']);                    // erba alta
def('lf', ['#b0e878', '#78c858', '#50a048', '#357838', '#20502c', '#143820']);          // chiome
def('tr', ['#b87c48', '#8c5830', '#5c381c', '#382010']);                               // tronchi
def('sd', ['#f8ecc0', '#ecd8a0', '#d8bc80', '#b89860', '#8c7048']);                    // sabbia / sterrato
def('pv', ['#f0ece0', '#dcd4c4', '#c4baa8', '#a09888', '#787060', '#585048']);          // pavé
def('wa', ['#f0fcff', '#a8e0f8', '#78c0f0', '#5098e0', '#3870c0', '#28509c']);          // acqua
def('bk', ['#a08060', '#786048', '#50402c']);                                         // argine
def('rk', ['#f0d8b0', '#d8b888', '#b89468', '#907048', '#684c30', '#43301e']);          // roccia
def('ol', ['#302830', '#201820']);                                                    // contorni scuri
def('wd', ['#f8e8c8', '#e8c898', '#c8a070', '#a07850', '#785430', '#503418']);          // legno chiaro (porte, panche)
def('wi', ['#ffffff', '#d8f4ff', '#a0d4f8', '#6aa4e8', '#4878c8', '#304c90']);          // vetri
def('st', ['#fcf8f0', '#e8e0d0', '#ccc2b0', '#a89e8c', '#80786a', '#585048']);          // pietra chiara
def('mt', ['#9098a8', '#606878', '#404450', '#282c34']);                              // metallo
def('li', ['#fff8c0', '#f8e070', '#f0b840']);                                         // luce, oro
def('fl', ['#ff7878', '#e03040', '#fff070', '#f8f8f8', '#ff98d0', '#b080f0']);          // fiori
// tetti: [chiaro, medio, scuro, ombra, contorno]
const ROOFS = {
  red:   ['#ffa890', '#f07058', '#c84838', '#903028', '#581c18'],
  blue:  ['#a8d0ff', '#70a0f0', '#4870d0', '#30509c', '#1c2c60'],
  green: ['#b0e8a0', '#70c070', '#489058', '#306840', '#1c3c28'],
  brown: ['#f8c880', '#e09850', '#b86c38', '#844828', '#4c2818'],
  slate: ['#d0d4e0', '#a0a8c0', '#747c98', '#50566c', '#303444'],
  teal:  ['#a8f0e0', '#60c8b8', '#389890', '#246c68', '#143c3c'],
};
for (const [k, v] of Object.entries(ROOFS)) def('r_' + k, v);
// muri: [chiaro, medio, ombra, contorno]
const WALLS = { cream:['#fffcec', '#f4e6c4', '#d8c498', '#a08c68'], ochre:['#fce4a0', '#f0c878', '#cc9c54', '#946c38'],
  pink:['#fff0e8', '#f4d0c4', '#d8a898', '#a07468'], white:['#ffffff', '#e8ecf0', '#c4c8d4', '#8c90a0'], brick:['#f09878', '#d06850', '#a84838', '#702c24'] };
for (const [k, v] of Object.entries(WALLS)) def('w_' + k, v);
// meno colori distinti = meno tavolozze: i materiali simili condividono le stesse tinte
C.pv0 = C.st1; C.pv1 = C.st2; C.pv2 = C.st3; C.pv3 = C.st4; C.pv4 = C.st5; C.pv5 = C.ol0;
C.st0 = C.wi0; C.mt3 = C.ol0; C.fl3 = C.wi0; C.fl2 = C.li1; C.wa0 = C.wi0;
C.tr0 = C.wd3; C.tr1 = C.wd4; C.tr2 = C.wd5; C.tr3 = C.ol1;
for (const k of Object.keys(WALLS)) C['w_' + k + '0'] = C.wi0;
C.w_white1 = C.st1; C.w_white2 = C.st2; C.w_white3 = C.st4;
C.bk2 = C.wd5; C.bk1 = C.wd4; C.bk0 = C.wd3;
C.rk5 = C.ol1;
// interni
def('fw', ['#f8d8a0', '#e8bc80', '#cc9860', '#a47444', '#744c2c']);  // parquet
def('wp', ['#fff8e8', '#f0e4c8', '#dcc8a0', '#b8a07c']);             // carta da parati
def('wt', ['#6c5040', '#4c3428', '#2c2018']);                        // sommità dei muri
def('tl', ['#ffffff', '#e4ecf8', '#c4d0e4', '#98a4c0']);             // piastrelle del negozio
def('cp', ['#f07070', '#d04048', '#982838', '#601c24']);             // tappeto rosso
def('bl', ['#90b8ff', '#6088e8', '#4060c0', '#2c4088']);             // coperte, stoffa blu
def('bo', ['#e05050', '#4878e0', '#50b060', '#f0c040', '#a060d0']);  // dorsi dei libri

// ---------- quali caratteri bloccano (come il gioco) ----------
export const BLOCKED = new Set(['d', '~', '^', 'T', '#', 'C', 'W', 'M', 'K', 'l', 'Z', 'O', 'H', 'P', ' ', 'G', 'Q', 'E', 'b', 'm', 'U']);
const BUILD = new Set(['#', 'D', 'C', 'd']);

// motivo periodico deterministico
const hp = (x, y, k)=>hash2(x, y, k);
const lerp = (a, b, t)=>a + (b - a) * t;

export function paintMap(id, m, frame=0, info={}){
  const Hc = m.tiles.length, Wc = Math.max(...m.tiles.map(r=>r.length));
  const PW = Wc * 16, PH = Hc * 16;
  const at = (x, y)=>y < 0 || y >= Hc || x < 0 || x >= Wc ? '' : (m.tiles[y][x] ?? ' ');
  const world = id === 'world', indoor = !!m.indoor || id === 'accademia';
  const blocked = (x, y)=>{ const c = at(x, y); return c === '' || BLOCKED.has(c) || info.blockedCells?.has(x + ',' + y); };
  const ground = new Int32Array(PW * PH).fill(-1), top = new Int32Array(PW * PH).fill(-1);
  const gset = (x, y, c)=>{ if (x >= 0 && y >= 0 && x < PW && y < PH && c != null) ground[y * PW + x] = c; };
  const gget = (x, y)=>x >= 0 && y >= 0 && x < PW && y < PH ? ground[y * PW + x] : -1;
  // pennello di un oggetto: sopra alla sua impronta, sulle caselle calpestabili, va nel livello alto
  const brush = (fx, fy, fw, fh)=>(x, y, c)=>{
    if (x < 0 || y < 0 || x >= PW || y >= PH || c == null) return;
    const cx = x >> 4, cy = y >> 4;
    if (y < fy * 16 && !(cx >= fx && cx < fx + fw && cy >= fy && cy < fy + fh) && !blocked(cx, cy)) top[y * PW + x] = c;
    else ground[y * PW + x] = c;
  };
  const out = { W:Wc, H:Hc, ground, top };
  if (indoor){ paintIndoor(); return out; }

  // ---------- terreno ----------
  const terr = (x, y)=>{
    const c = at(x, y);
    if (c === '') return 'edge';
    if (c === '~' || c === 'B') return 'water';
    if (c === ':') return 'pave';
    if (c === '=') return 'sand';
    if (c === ',') return world ? 'meadow' : 'tall';
    if (c === '^') return id === 'sacromonte' ? 'solid' : 'rock';
    if (c === ' ') return 'void';
    if ('mbQUP'.includes(c)){ let n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(x + dx, y + dy) === ':') n++; return n >= 2 || c === 'm' ? 'pave' : 'grass'; }
    if (BUILD.has(c) || c === 'W' || c === 'A' || c === 'S' || /\d/.test(c)) return 'solid';   // coperto dall'oggetto
    return 'grass';
  };
  const grassy = t=>t === 'grass' || t === 'tall' || t === 'meadow' || t === 'edge';
  const EDGE = [1, 2, 2, 1, 1, 2, 3, 2, 1, 1, 2, 2, 1, 0, 1, 2];   // frangia d'erba sui bordi (periodo 16)

  function grassPx(x, y, v){
    const lx = x & 15, ly = y & 15;
    // ciuffetti a "v" su una griglia sfalsata, come nei giochi GBA
    const tufts = [[3, 3], [11, 6], [6, 11], [14, 14]];
    let c = C.g2;
    for (const [tx, ty] of tufts.slice(v === 0 ? 0 : v === 1 ? 2 : 1, v === 0 ? 2 : v === 1 ? 3 : 1)){
      const dx = lx - tx, dy = ly - ty;
      if ((dy === 0 && (dx === -1 || dx === 1)) || (dy === 1 && dx === 0)) c = C.g4;
      else if (dy === -1 && dx === 0) c = C.g1;
    }
    if (v === 1 && ((lx === 8 && ly === 2) || (lx === 1 && ly === 9))) c = C.g3;
    return c;
  }
  function meadowPx(x, y){
    // prato della provincia: erba con ciuffi alti radi (dove si incontrano i mostri), in punti diversi per casella
    const lx = x & 15, ly = y & 15, cx = x >> 4, cy = y >> 4, k = (hp(cx, cy, 21) * 4) | 0;
    let c = grassPx(x, y, (hp(cx, cy, 7) * 3) | 0);
    const spots = [[[4, 7]], [[11, 12]], [[5, 13], [12, 6]], []][k];
    for (const [bx, by] of spots){
      const dx = lx - bx, dy = ly - by;
      if (dy <= 0 && dy > -5 && Math.abs(dx) <= (5 + dy) / 2){ c = Math.abs(dx) * 2 >= 4 + dy ? C.tg3 : dx < 0 ? C.tg1 : C.tg2; if (dy === -4) c = C.tg0; }
    }
    return c;
  }
  function tallPx(x, y){
    // erba alta: file di fili appuntiti, bordi scuri e luci al centro
    const lx = x & 15, ly = y & 15;
    const row = ly < 8 ? 0 : 1, oy = ly & 7, ox = (lx + (row ? 4 : 0)) & 7;
    const pat = ['...o....', '..olo...', '..olo..o', '.olmlo.o', '.olmlool', 'olmmmlol', 'olmmmmlm', 'ommmmmmm'];
    const ch = pat[oy][ox];
    if (ch === 'o') return C.tg4; if (ch === 'l') return C.tg0; if (ch === 'm') return oy === 7 ? C.tg3 : C.tg1;
    return row === 0 && oy < 3 ? grassPx(x, y, 2) : C.tg2;
  }
  function pavePx(x, y){
    // pavé a cubetti sfalsati con ombre in basso a destra
    const lx = x & 15, ly = y & 15, r = ly >> 2, cx = (lx + (r & 1) * 2) & 3, cy = ly & 3;
    if (cy === 3 || cx === 3) return C.pv3;
    if (cy === 0 && cx < 3) return (hp(lx >> 2, r, 3) < 0.5) ? C.pv0 : C.pv1;
    if (cx === 2 || cy === 2) return C.pv2;
    return C.pv1;
  }
  function sandPx(x, y){
    const lx = x & 15, ly = y & 15;
    const dots = [[2, 3, C.sd2], [9, 1, C.sd2], [13, 7, C.sd3], [5, 9, C.sd2], [11, 12, C.sd2], [1, 14, C.sd3], [7, 5, C.sd0], [14, 2, C.sd0], [3, 12, C.sd0]];
    for (const [dx, dy, c] of dots) if (lx === dx && ly === dy) return c;
    return C.sd1;
  }
  function waterPx(x, y){
    const lx = x & 15, ly = y & 15;
    const s = (lx + frame * 4) & 15;
    // increspature: trattini chiari su due file, spostate nel secondo fotogramma
    if ((ly === 3 && s >= 2 && s <= 5) || (ly === 11 && s >= 10 && s <= 13)) return C.wa1;
    if ((ly === 4 && (s === 1 || s === 6)) || (ly === 12 && (s === 9 || s === 14))) return C.wa2;
    if ((ly === 7 && ((lx + 16 - frame * 4) & 15) >= 6 && ((lx + 16 - frame * 4) & 15) <= 8)) return C.wa2;
    return ly < 1 ? C.wa3 : C.wa3;
  }
  function rockPx(x, y){
    const lx0 = x & 31, ly0 = y & 31;
    for (const [px, py, r] of [[6, 6, 2.6], [23, 11, 2], [13, 24, 2.8], [28, 27, 1.6]]){
      const dx = lx0 + 0.5 - px, dy = ly0 + 0.5 - py, d = Math.hypot(dx, dy);
      if (d <= r){ const lit = -dx - dy; return d > r - 1 && dx + dy > 0 ? C.rk4 : lit > r * 0.6 ? C.rk0 : lit > -r * 0.3 ? C.rk1 : C.rk2; }
      if (d <= r + 1 && dx + dy > 0) return C.rk3;       // ombra del ciottolo
    }
    // altopiano roccioso: lastroni con crepe e luci
    const lx = x & 15, ly = y & 15;
    const cracks = ['..........o.....', '...........o....', '.o..........o...', '..o.............', '...oo...........', '.....o......l...', '......o....ll...', '................',
                    '.........o......', '....l.....o.....', '...ll......oo...', '.............o..', 'o...............', '.o.....l........', '..o...ll........', '................'];
    const ch = cracks[ly][lx];
    if (ch === 'o') return C.rk3; if (ch === 'l') return C.rk0;
    return (hp(lx >> 2, ly >> 2, 9) < 0.3) ? C.rk2 : C.rk1;
  }
  const basePx = (t, x, y, v)=>t === 'tall' ? tallPx(x, y) : t === 'meadow' ? meadowPx(x, y) : t === 'pave' ? pavePx(x, y) : t === 'sand' ? sandPx(x, y) : t === 'water' ? waterPx(x, y) : t === 'rock' ? rockPx(x, y) : t === 'void' ? C.ol1 : grassPx(x, y, v);

  for (let cy = 0; cy < Hc; cy++) for (let cx = 0; cx < Wc; cx++){
    const t = terr(cx, cy), v = (hp(cx, cy, 7) * 3) | 0;
    const base = t === 'solid' ? 'grass' : t;
    const nb = (dx, dy)=>terr(cx + dx, cy + dy);
    for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++){
      const x = cx * 16 + lx, y = cy * 16 + ly;
      let c = basePx(base, x, y, v);
      if (base === 'pave' || base === 'sand'){
        // l'erba intorno invade il sentiero con una frangia irregolare e un filo d'ombra
        let d = 99;
        const sides = [[0, -1, ly, lx], [0, 1, 15 - ly, lx], [-1, 0, lx, ly], [1, 0, 15 - lx, ly]];
        const g = sides.map(([dx, dy])=>grassy(nb(dx, dy)));
        sides.forEach(([dx, dy, dist, along], i)=>{ if (g[i]) d = Math.min(d, dist - EDGE[(along + (dx ? cy : cx) * 5) & 15]); });
        for (const [dx, dy, ex, ey] of [[-1, -1, 0, 0], [1, -1, 15, 0], [-1, 1, 0, 15], [1, 1, 15, 15]]){
          if (grassy(nb(dx, dy)) && !grassy(nb(dx, 0)) && !grassy(nb(0, dy))) d = Math.min(d, Math.hypot(lx - ex, ly - ey) - 2);
        }
        if (d < 0) c = grassPx(x, y, v); else if (d < 1) c = C.g4; else if (d < 2) c = base === 'pave' ? C.pv4 : C.sd3;
      }
      if (base === 'water'){
        // rive: a nord un argine di terra, altrove l'erba (o il pavé) con bordo scuro e schiuma
        const shore = (dx, dy)=>{ const n = nb(dx, dy); return n !== 'water' && n !== 'edge'; };
        const N = shore(0, -1), S = shore(0, 1), Wt = shore(-1, 0), E = shore(1, 0);
        const land = (dx, dy)=>{ const n = nb(dx, dy); return n === 'pave' ? pavePx(x, y) : n === 'rock' ? rockPx(x, y) : grassPx(x, y, v); };
        const along = (a)=>EDGE[(a + cx * 3 + cy * 7) & 15] >> 1;
        if (N){ const e = 1 + along(lx); if (ly < e) c = land(0, -1); else if (ly < e + 1) c = C.g5; else if (ly < e + 4) c = ly === e + 1 ? C.bk0 : ly === e + 2 ? C.bk1 : C.bk2; }
        if (S){ const e = 14 - along(lx); if (ly > e) c = land(0, 1); else if (ly === e) c = C.g5; else if (ly === e - 1) c = C.wa1; }
        if (Wt){ const e = 1 + along(ly); if (lx < e) c = land(-1, 0); else if (lx === e) c = C.g5; else if (lx === e + 1 && !(N && ly < 6)) c = C.wa1; }
        if (E){ const e = 14 - along(ly); if (lx > e) c = land(1, 0); else if (lx === e) c = C.g5; else if (lx === e - 1 && !(N && ly < 6)) c = C.wa1; }
        // angoli interni
        for (const [dx, dy, ex, ey] of [[-1, -1, 0, 0], [1, -1, 15, 0], [-1, 1, 0, 15], [1, 1, 15, 15]]){
          if (shore(dx, dy) && !shore(dx, 0) && !shore(0, dy)){ const d = Math.hypot(lx - ex, ly - ey); if (d < 2.5) c = land(dx, dy); else if (d < 3.5) c = C.g5; }
        }
      }
      if (base === 'rock'){
        // parete di roccia dove sotto non c'è più roccia; bordi laterali scuri
        const sN = nb(0, 1) !== 'rock' && nb(0, 1) !== 'edge', sW = nb(-1, 0) !== 'rock' && nb(-1, 0) !== 'edge', sE = nb(1, 0) !== 'rock' && nb(1, 0) !== 'edge', sT = nb(0, -1) !== 'rock' && nb(0, -1) !== 'edge';
        if (sN && ly >= 6){
          // parete: strisce verticali, luce in alto, piede scuro
          const k = (lx + cx * 5) % 6;
          c = ly === 6 ? C.rk0 : ly === 15 ? C.rk5 : ly >= 13 ? C.rk4 : k === 0 ? C.rk4 : k === 1 ? C.rk2 : k === 3 ? C.rk3 : C.rk2 + 0;
          if (ly === 7) c = C.rk1;
        }
        if (sW && lx === 0) c = C.rk4; if (sW && lx === 1) c = C.rk0;
        if (sE && lx === 15) c = C.rk5; if (sE && lx === 14) c = C.rk3;
        if (sT && ly === 0) c = C.rk4; if (sT && ly === 1) c = C.rk0;
        // ciuffi d'erba sulla roccia
        if (!sN && !sT && hp(cx, cy, 31) < 0.25 && ly >= 9 && ly <= 11 && lx >= 3 && lx <= 7){ const dx = lx - 5; if ((ly === 9 && dx === 0) || (ly === 10 && Math.abs(dx) === 1) || (ly === 11 && Math.abs(dx) <= 2)) c = ly === 9 ? C.g1 : C.g3; }
      }
      if (base === 'tall'){
        // l'erba alta termina con le punte sopra l'erba bassa
        if (!['tall'].includes(nb(0, -1)) && ly < 2) c = grassPx(x, y, v);
      }
      gset(x, y, c);
    }
  }

  // ---------- oggetti ----------
  const objs = [];     // { y (riga del piede), draw() }
  const add = (footBottom, fn)=>objs.push({ y:footBottom, fn });
  const seen = new Set();
  // edifici: componenti connesse di #, D, C, d
  for (let cy = 0; cy < Hc; cy++) for (let cx = 0; cx < Wc; cx++){
    if (!BUILD.has(at(cx, cy)) || seen.has(cx + ',' + cy)) continue;
    const cells = [], q = [[cx, cy]]; seen.add(cx + ',' + cy);
    while (q.length){ const [x, y] = q.pop(); cells.push([x, y]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const k = (x + dx) + ',' + (y + dy); if (BUILD.has(at(x + dx, y + dy)) && !seen.has(k)){ seen.add(k); q.push([x + dx, y + dy]); } } }
    const xs = cells.map(c=>c[0]), ys = cells.map(c=>c[1]);
    let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const towers = [];
    for (let y = y0; y <= y1; y++) for (const x of [x0 - 1, x1 + 1]) if (at(x, y) === 'W') towers.push([x, y]);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (at(x, y) === 'W') towers.push([x, y]);
    const church = cells.some(([x, y])=>at(x, y) === 'C');
    const castle = !church && towers.length >= 2;
    if (castle){ x0 = Math.min(x0, ...towers.map(t=>t[0])); x1 = Math.max(x1, ...towers.map(t=>t[0])); }
    const doors = cells.filter(([x, y])=>at(x, y) === 'D' || at(x, y) === 'd').map(([x, y])=>({ x, y, to:info.portals?.[x + ',' + y] }));
    const kind = church ? 'church' : castle ? 'castle' : doors.some(d=>/^negozio/.test(d.to || '')) ? 'shop' : doors.some(d=>/^locanda/.test(d.to || '')) ? 'inn' : (x1 - x0 + 1) >= 7 ? 'palazzo' : 'house';
    const b = { x0, y0, x1, y1, doors, kind, towers, seed:x0 * 31 + y0 * 17 + id.length };
    add(y1, ()=>drawBuilding(b));
    if (!castle) for (const t of towers) add(t[1] - 0.5, ()=>drawTower(t[0], t[1], church ? 'campanile' : 'civica'));
    else for (const t of towers) add(y1 + 0.1, ()=>drawTower(t[0], t[1], 'castle'));
  }
  for (let cy = 0; cy < Hc; cy++) for (let cx = 0; cx < Wc; cx++){
    const c = at(cx, cy);
    if (c === 'T' || (c === '^' && id === 'sacromonte')) add(cy, ()=>drawTree(cx, cy));
    else if (c === 'E') add(cy, ()=>drawHedge(cx, cy));
    else if (c === 'F') add(cy - 0.9, ()=>drawFlowers(cx, cy));
    else if (c === 'P') add(cy, ()=>drawLamp(cx, cy));
    else if (c === 'b') add(cy, ()=>drawBench(cx, cy));
    else if (c === 'Q') add(cy, ()=>drawFountain(cx, cy));
    else if (c === 'U') add(cy, ()=>drawStatue(cx, cy));
    else if (c === 'm') add(cy, ()=>drawStall(cx, cy));
    else if (c === 'G') add(cy, ()=>drawGundam(cx, cy));
    else if (c === 'B') add(cy - 0.5, ()=>drawBridge(cx, cy));
    else if (c === 'A') add(cy, ()=>drawGate(cx, cy, 'accademia'));
    else if (c === 'S') add(cy, ()=>world ? drawGate(cx, cy, 'shrine') : drawGate(cx, cy, 'accademia'));
    else if (/\d/.test(c)) add(cy, ()=>drawTown(cx, cy));
    else if (c === 'W' && !BUILD.has(at(cx - 1, cy)) && !BUILD.has(at(cx + 1, cy))) add(cy, ()=>drawTower(cx, cy, 'civica'));
  }
  if (id === 'sacromonte') add(1, ()=>drawSanctuary(7, 0, 4, 2));
  objs.sort((a, b)=>a.y - b.y);
  for (const o of objs) o.fn();
  return out;

  // ================= pittori degli oggetti =================
  function drawTree(cx, cy){
    // albero alto due caselle: grappoli di foglie disegnati dal fondo al davanti, ognuno con la sua luce
    const p = brush(cx, cy, 1, 1), X = cx * 16, Y = cy * 16;
    // sul bordo alto della mappa la chioma scende nella casella (altrimenti resterebbe tagliata)
    const off = at(cx, cy - 1) === '' ? 7 : 0;
    const lobes = [[8, -5.5, 5.4], [3.8, -1, 4.3], [12.2, -1, 4.3], [8, 0, 5.2], [3.6, 4.5, 3.7], [12.4, 4.5, 3.7], [8, 5.5, 4.2]].map(([x, y, r])=>[x, Math.min(y + off, 11.5 - r * 0.6), r]);
    // ombra per terra e tronco
    for (let y = 12; y < 16; y++) for (let x = 1; x < 15; x++) if (((x - 8) / 6.5) ** 2 + ((y - 13.5) / 2.3) ** 2 <= 1) shadeGround(X + x, Y + y);
    for (let y = 8; y < 15; y++) for (let x = 6; x < 10; x++) p(X + x, Y + y, x === 6 ? C.wd3 : x === 9 ? C.wd5 : C.wd4);
    p(X + 5, Y + 14, C.wd5); p(X + 10, Y + 14, C.wd5); for (let x = 5; x < 11; x++) p(X + x, Y + 15, C.ol1);
    const can = new Map();
    for (const [lx, ly, r] of lobes){
      for (let py = Math.floor(ly - r); py <= Math.ceil(ly + r); py++) for (let px = Math.floor(lx - r); px <= Math.ceil(lx + r); px++){
        const dx = px + 0.5 - lx, dy = py + 0.5 - ly, d = Math.hypot(dx, dy);
        if (d > r || px < 0 || px > 15) continue;
        const nx = dx / r, ny = dy / r, lit = -nx * 0.55 - ny * 0.85;
        let c = lit > 0.62 ? C.lf0 : lit > 0.2 ? C.lf1 : lit > -0.3 ? C.lf2 : lit > -0.7 ? C.lf3 : C.lf4;
        const k = px + ',' + py;
        if (d > r - 1.1 && ny < 0.3 && can.has(k)) c = C.lf4;      // bordo del grappolo sopra quello dietro
        can.set(k, c);
      }
    }
    for (const [k, c] of can){
      const [px, py] = k.split(',').map(Number);
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy])=>!can.has((px + dx) + ',' + (py + dy)));
      p(X + px, Y + py, edge ? C.lf5 : c);
    }
  }
  function drawHedge(cx, cy){
    // siepe: cespugli tondi che si uniscono ai vicini
    const p = brush(cx, cy, 1, 1), X = cx * 16, Y = cy * 16;
    const L = at(cx - 1, cy) === 'E', R = at(cx + 1, cy) === 'E', U = at(cx, cy - 1) === 'E', D = at(cx, cy + 1) === 'E';
    const inside = (x, y)=>{
      const x0 = L ? -1 : 1, x1 = R ? 16 : 14, y0 = U ? -1 : 1, y1 = D ? 16 : 13;
      if (x < x0 || x > x1 || y < y0 || y > y1) return false;
      const rr = 4; const cxr = x < x0 + rr && !L ? x0 + rr : x > x1 - rr && !R ? x1 - rr : x, cyr = y < y0 + rr && !U ? y0 + rr : y > y1 - rr && !D ? y1 - rr : y;
      return (x - cxr) ** 2 + (y - cyr) ** 2 <= rr * rr + 1;
    };
    for (let y = -2; y < 16; y++) for (let x = 0; x < 16; x++){
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) && !L || !inside(x + 1, y) && !R || !inside(x, y - 1) && !U || !inside(x, y + 1) && !D;
      const leaf = ((x * 3 + y * 5) % 7 === 0) ? C.lf1 : ((x + y * 3) % 5 === 0) ? C.lf3 : C.lf2;
      p(X + x, Y + y, edge ? C.lf5 : (!U && y < 4) ? (y < 3 ? C.lf0 : C.lf1) : (!D && y > 10) ? C.lf3 : leaf);
    }
  }
  function drawFlowers(cx, cy){
    const X = cx * 16, Y = cy * 16;
    const cols = [[C.fl0, C.fl1], [C.fl2, C.li2], [C.fl3, C.fl5], [C.fl4, C.fl1]];
    for (const [fx, fy, k] of [[3, 3, 0], [11, 4, 1], [7, 9, 2], [2, 12, 1], [13, 12, 0]]){
      const [a, b] = cols[(k + cx + cy) % 4];
      // la corolla ondeggia di un pixel nel secondo fotogramma (a destra o a sinistra, fiore per fiore)
      const sw = frame ? ((k + cx) % 2 ? 1 : -1) : 0, hx = fx + sw;
      gset(X + hx, Y + fy - 1, a); gset(X + hx - 1, Y + fy, a); gset(X + hx + 1, Y + fy, a); gset(X + fx, Y + fy + 1, b); gset(X + hx, Y + fy, C.li1);
      gset(X + fx + 1, Y + fy + 1, C.g4); gset(X + fx - 1, Y + fy + 1, C.g3);
    }
  }
  function drawLamp(cx, cy){
    const p = brush(cx, cy, 1, 1), X = cx * 16, Y = cy * 16;
    for (let y = -2; y < 14; y++){ p(X + 7, Y + y, C.mt1); p(X + 8, Y + y, C.mt2); }
    for (let x = 5; x < 11; x++){ p(X + x, Y + 13, C.mt2); p(X + x, Y + 14, C.mt3); } p(X + 6, Y + 12, C.mt1); p(X + 9, Y + 12, C.mt2);
    // lanterna
    const lan = ['..oooo..', '.oyyyyo.', 'oyWWyyyo', 'oyWyyyyo', 'oyyyyyyo', '.oyyyyo.', '..oooo..', '...oo...'];
    lan.forEach((r, j)=>[...r].forEach((ch, i)=>{ if (ch !== '.') p(X + 4 + i, Y - 10 + j, ch === 'o' ? C.mt3 : ch === 'W' ? C.li0 : C.li1); }));
    for (let x = 5; x < 11; x++) p(X + x, Y - 11, C.mt2);
    for (let y = 14; y < 16; y++) for (let x = 4; x < 12; x++) if (gget(X + x, Y + y) === C.g2) gset(X + x, Y + y, C.g3);
  }
  function drawBench(cx, cy){
    const p = brush(cx, cy, 1, 1), X = cx * 16, Y = cy * 16;
    const rows = ['................', '.oooooooooooooo.', '.oaaaaaaaaaaaao.', '.obbbbbbbbbbbbo.', '.oooooooooooooo.', '.oaaaaaaaaaaaao.', '.occcccccccccco.', '.oooooooooooooo.', '.om..........mo.', '.om..........mo.', '.oo..........oo.'];
    rows.forEach((r, j)=>[...r].forEach((ch, i)=>{ if (ch !== '.') p(X + i, Y + 2 + j, ch === 'o' ? C.wd5 : ch === 'a' ? C.wd1 : ch === 'b' ? C.wd2 : ch === 'c' ? C.wd3 : C.mt2); }));
    for (let x = 2; x < 14; x++) if (gget(X + x, Y + 13) !== -1) gset(X + x, Y + 13, gget(X + x, Y + 13) === C.pv1 || gget(X + x, Y + 13) === C.pv2 ? C.pv3 : C.g4);
  }
  function drawFountain(cx, cy){
    const p = brush(cx, cy, 1, 1), X = cx * 16, Y = cy * 16;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++){
      const dx = (x + 0.5 - 8) / 7.8, dy = (y + 0.5 - 9.5) / 6.2, r = Math.hypot(dx, dy);
      if (r > 1) continue;
      const rim = r > 0.78;
      let c = rim ? (r > 0.93 ? C.st4 : dy < 0 ? C.st1 : C.st2) : C.wa3;
      if (!rim && ((x + y + frame * 2) % 5 === 0)) c = C.wa1;
      if (!rim && r < 0.25) c = C.st2;
      p(X + x, Y + y, c);
    }
    // getto d'acqua
    const jet = frame ? ['..w..', '.w.w.', 'w.a.w', '..a..', '..a..', '..a..'] : ['..w..', '.waw.', '..a..', '.a.a.', '..a..', '..a..'];
    jet.forEach((r, j)=>[...r].forEach((ch, i)=>{ if (ch !== '.') p(X + 6 + i, Y - 1 + j, ch === 'w' ? C.wa0 : C.wa1); }));
    p(X + 7, Y + 9, C.st1); p(X + 8, Y + 9, C.st2);
  }
  function drawStatue(cx, cy){
    const p = brush(cx, cy, 1, 1), X = cx * 16, Y = cy * 16;
    // piedistallo di pietra e figura di bronzo
    for (let y = 6; y < 16; y++) for (let x = 2; x < 14; x++) p(X + x, Y + y, y === 6 ? C.st0 : y === 15 ? C.st5 : x === 2 ? C.st4 : x === 13 ? C.st4 : y > 12 ? C.st3 : x < 5 ? C.st1 : C.st2);
    const fig = ['....ooo.....', '...obbbo....', '...obbco....', '....occ.....', '..oobbboo...', '.obbbbbbco..', '.ob.bbbc.o..', '...obbco....', '...ob.co....', '...ob.co....', '..oob.coo...'];
    fig.forEach((r, j)=>[...r].forEach((ch, i)=>{ if (ch !== '.') p(X + 2 + i, Y - 5 + j, ch === 'o' ? C.ol0 : ch === 'b' ? C.r_teal2 : C.r_teal3); }));
  }
  function drawStall(cx, cy){
    // bancarella del mercato: tendone a strisce e cassette di frutta
    const p = brush(cx, cy, 1, 1), X = cx * 16, Y = cy * 16;
    const col = [[C.r_red1, C.r_red2], [C.r_blue1, C.r_blue2], [C.r_green1, C.r_green2]][(cx + cy) % 3];
    for (let y = -6; y < 2; y++) for (let x = 0; x < 16; x++){ const s = ((x >> 1) & 1); p(X + x, Y + y, y === -6 ? C.ol0 : y === 1 ? C.ol0 : s ? C.st0 : (y > -1 ? col[1] : col[0])); }
    for (let x = 0; x < 16; x += 2) p(X + x, Y + 2, (x >> 1) & 1 ? C.st1 : col[1]);
    for (let y = 2; y < 14; y++){ p(X + 1, Y + y, C.wd4); p(X + 14, Y + y, C.wd4); }
    for (let y = 8; y < 14; y++) for (let x = 2; x < 14; x++) p(X + x, Y + y, y === 8 ? C.wd1 : y === 13 ? C.wd5 : C.wd3);
    for (const [fx, c] of [[3, C.fl1], [5, C.li1], [8, C.g3], [10, C.fl0], [12, C.li2]]){ p(X + fx, Y + 7, c); p(X + fx + 1, Y + 7, c); p(X + fx, Y + 6, c); }
  }
  function drawGundam(cx, cy){
    // la statua del Gundam nel parco di Vedano: due caselle d'altezza
    const p = brush(cx, cy, 1, 1), X = cx * 16, Y = cy * 16;
    const g = ['.....oyyo.......', '....owwwwo......', '...owwyrwwo.....', '...owbbbbwo.....', '..oobwwwwbo.....', '.owwobbbbowwo...', 'owwwobbbbowwwo..', 'owbwobyyboowbwo.',
               'owbwowrrwowwbwo.', 'owwoowwwwoowwo..', '.oo.obbbbo.oo...', '....owwwwo......', '...owwoowwo.....', '...obbo.obbo....', '...obbo.obbo....', '...owwo.owwo....',
               '..obbbo.obbbo...', '..owwwo.owwwo...', '..ooooo.ooooo...'];
    g.forEach((r, j)=>[...r].forEach((ch, i)=>{ if (ch !== '.') p(X + i + 1, Y - 18 + j + 16 - g.length + 1, ch === 'o' ? C.ol0 : ch === 'w' ? C.st0 : ch === 'b' ? C.r_blue2 : ch === 'r' ? C.fl1 : C.li1); }));
    for (let x = 1; x < 15; x++){ p(X + x, Y + 14, C.st3); p(X + x, Y + 15, C.st4); }
  }
  function drawBridge(cx, cy){
    const X = cx * 16, Y = cy * 16;
    const ns = terr(cx - 1, cy) === 'water' && terr(cx + 1, cy) === 'water';   // ponte da percorrere nord-sud
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++){
      const a = ns ? y : x, b = ns ? x : y;       // a: lungo il ponte, b: di traverso
      let c = (a % 4 === 3) ? C.wd4 : (a % 4 === 0) ? C.wd1 : C.wd2;
      if (b <= 1 || b >= 14) c = b === 0 || b === 15 ? C.wd5 : C.wd3;
      gset(X + x, Y + y, c);
    }
  }
  function drawGate(cx, cy, kind){
    // portale d'ingresso (Accademia, santuario sulla mappa del mondo)
    const p = brush(cx, cy, 1, 1), X = cx * 16, Y = cy * 16;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) gset(X + x, Y + y, pavePx(X + x, Y + y));
    const stone = (x, y, w, h)=>{ for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p(X + x + i, Y + y + j, i === 0 ? C.st1 : i === w - 1 ? C.st4 : j === h - 1 ? C.st4 : ((j + (i >> 2)) % 5 === 0) ? C.st3 : C.st2); };
    stone(0, -14, 3, 30); stone(13, -14, 3, 30);
    for (let x = 0; x < 16; x++) for (let y = -18; y < -12; y++) p(X + x, Y + y, y === -18 ? C.ol0 : y === -13 ? C.st4 : kind === 'shrine' ? C.st1 : C.li1 + 0);
    for (let x = 3; x < 13; x++) p(X + x, Y + -12, C.st4);
    if (kind === 'shrine'){ for (let y = -24; y < -18; y++) p(X + 7, Y + y, C.li1), p(X + 8, Y + y, C.li2); for (let x = 5; x < 11; x++) p(X + x, Y - 22, C.li1); }
    else for (let x = 2; x < 14; x += 3) p(X + x, Y - 16, C.li2);
  }
  function drawTown(cx, cy){
    // ingresso di un paese sulla mappa: piazzola, arco di legno con bandierine
    const p = brush(cx, cy, 1, 1), X = cx * 16, Y = cy * 16;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) gset(X + x, Y + y, pavePx(X + x, Y + y));
    for (let y = -14; y < 16; y++){ p(X + 1, Y + y, C.wd3); p(X + 2, Y + y, C.wd4); p(X + 13, Y + y, C.wd3); p(X + 14, Y + y, C.wd4); }
    for (let x = 0; x < 16; x++){ p(X + x, Y - 15, C.wd5); p(X + x, Y - 14, C.wd2); p(X + x, Y - 13, C.wd4); }
    const fl = [C.fl1, C.li1, C.r_blue1, C.g1];
    for (let k = 0; k < 4; k++){ const fx = 3 + k * 3; p(X + fx, Y - 12, fl[k]); p(X + fx + 1, Y - 12, fl[k]); p(X + fx, Y - 11, fl[k]); }
  }

  // ---------- edifici ----------
  function drawBuilding(b){
    const { x0, y0, x1, y1, kind } = b;
    const fw = x1 - x0 + 1, fh = y1 - y0 + 1, X = x0 * 16, Y = y0 * 16, Wp = fw * 16, Hp = fh * 16;
    const p = brush(x0, y0, fw, fh);
    if (kind === 'church') return drawChurch(b);
    if (kind === 'castle') return drawCastle(b);
    const rk = kind === 'shop' ? 'blue' : kind === 'inn' ? 'red' : kind === 'palazzo' ? 'slate' : ['red', 'green', 'brown', 'teal', 'blue', 'green'][b.seed % 6];
    const R = i=>C['r_' + rk + i];
    const wk = kind === 'palazzo' ? 'ochre' : kind === 'shop' ? 'white' : kind === 'inn' ? 'cream' : ['cream', 'pink', 'white'][(b.seed >> 1) % 3];
    const Wl = i=>C['w_' + wk + i];
    // tetto da -16 a 8 (sale di una casella sopra l'impronta), facciata da 8 in giù: i bordi cadono sui tile
    // se appena sopra c'è la porta di un altro edificio, il tetto sporge poco: chi esce da lì resta visibile
    let crowded = false; for (let x = x0; x <= x1; x++) if (BUILD.has(at(x, y0 - 2))) crowded = true;
    const roofTop = crowded ? -6 : -16, roofBot = 8;
    // ombra a terra a destra dell'edificio
    for (let y = 2; y < Hp; y++) for (let x = Wp; x < Wp + 2; x++) shadeGround(X + x, Y + y);
    // ---- facciata (rientrata di un pixel sotto la gronda) ----
    for (let y = roofBot; y < Hp; y++) for (let x = 0; x < Wp; x++){
      const wy = y - roofBot;
      let c = wy % 6 === 5 ? Wl(2) : Wl(1);                                  // doghe orizzontali
      if (x === 0) c = C.ol0; else if (x === Wp - 1) c = C.ol0; else if (x === 1) c = Wl(0); else if (x === Wp - 2) c = Wl(2);
      if (wy === 0) c = C.ol0; else if (wy === 1 || wy === 2) c = Wl(3);    // ombra della gronda
      if (y >= Hp - 2) c = y === Hp - 1 ? C.ol0 : Wl(3);                     // zoccolo
      p(X + x, Y + y, c);
    }
    const doorCols = new Set(b.doors.map(d=>d.x - x0));
    const winRows = fh >= 3 ? [roofBot + 6, roofBot + 22] : [roofBot + 6];
    for (let i = 0; i < fw; i++){
      if (doorCols.has(i)) continue;
      for (const wy of winRows) drawWindow(p, X + i * 16 + 3, Y + wy, 10, 9, Wl, null);
    }
    for (const d of b.doors){
      const dx = X + (d.x - x0) * 16, dbl = b.doors.some(o=>o.x === d.x + 1 && o.y === d.y) ? 'L' : b.doors.some(o=>o.x === d.x - 1 && o.y === d.y) ? 'R' : '';
      drawDoor(p, dx, Y + Hp - 16, kind, dbl, Wl);
      for (let x = (dbl === 'R' ? 0 : 2); x < (dbl === 'L' ? 16 : 14); x++){ gset(dx + x, Y + Hp, C.pv1); gset(dx + x, Y + Hp + 1, C.pv3); }   // gradino
    }
    if (kind === 'shop' || kind === 'inn'){
      const d = b.doors[0], dbl = b.doors.some(o=>o.x === d.x + 1);
      drawSign(p, X + (d.x - x0) * 16 + (dbl ? 8 : 0) - 1, Y + roofBot + 3, kind, R);
    }
    // ---- tetto ----
    for (let y = roofTop; y < roofBot; y++) for (let x = 0; x < Wp; x++){
      const ry = y - roofTop, rh = roofBot - roofTop;
      let c;
      if (kind === 'palazzo'){
        // tetto a padiglione di lamiera con parapetto chiaro
        c = ry === 0 ? R(4) : ry < 3 ? R(0) : ry >= rh - 3 ? (ry === rh - 1 ? R(4) : ry === rh - 3 ? R(0) : R(2)) : (x % 6 === 0 ? R(2) : (ry & 1) ? R(1) : R(1));
        if (ry >= 3 && ry < rh - 3 && x % 6 === 1) c = R(0);
      } else {
        // tegole: file da 4 pixel (riga chiara, due medie, fuga scura) sfalsate di 3
        const row = (ry - 2) >> 2, k = (ry - 2) & 3, off = (row & 1) * 4;
        c = k === 0 ? R(0) : k === 3 ? R(2) : R(1);
        if ((k === 1 || k === 2) && ((x + off) & 7) === 0) c = R(2);
        if (ry === 0) c = R(4); else if (ry === 1) c = R(0);                  // colmo
        if (ry >= rh - 2) c = ry === rh - 1 ? R(4) : R(3);                    // gronda
      }
      if (x === 0 || x === Wp - 1) c = R(4); else if (x === 1 && ry > 0 && ry < rh - 1) c = R(0); else if (x === Wp - 2 && ry > 0 && ry < rh - 1) c = R(3);
      p(X + x, Y + y, c);
    }
    // comignolo (sul tetto, non sopra: non copre il giocatore più di così)
    if ((kind === 'house' || kind === 'inn') && !crowded){
      const cxp = X + Wp - 16 - (b.seed % 2) * 16 + 4;
      for (let y = -14; y < -5; y++) for (let x = 0; x < 6; x++) p(cxp + x, Y + y, y === -14 || x === 0 || x === 5 ? R(4) : y === -13 ? R(0) : y === -6 ? R(3) : x < 3 ? R(1) : R(2));
    }
  }
  function shadeGround(x, y){
    const g = gget(x, y), m = new Map([[C.g1, C.g3], [C.g2, C.g3], [C.g3, C.g4], [C.pv0, C.pv2], [C.pv1, C.pv2], [C.pv2, C.pv3], [C.sd1, C.sd2], [C.sd0, C.sd2]]);
    if (m.has(g)) gset(x, y, m.get(g));
  }
  function drawWindow(p, x, y, w, h, Wl, shut){
    // finestra: cornice bianca, vetro azzurro con riflesso diagonale, davanzale, persiane nel colore del tetto
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++){
      let c;
      if (j === -1 || j === h || i === -1 || i === w) c = C.ol0;
      else if (j === 0 || i === 0 || i === w - 1 || j === h - 1 || i === (w >> 1)) c = C.wi0;
      else { const t = (i - j + 20) % 6; c = (t === 0 || t === 1) && j < h - 2 ? C.wi0 : j < 3 ? C.wi2 : C.wi3; }
      p(x + i, y + j, c);
    }
    for (let i = -1; i <= w; i++) p(x + i, y + h + 1, i === -1 || i === w ? Wl(3) : C.wi0);
    if (shut) for (let j = 0; j < h; j++){ p(x - 2, y + j, j === 0 ? shut(0) : shut(1)); p(x + w + 1, y + j, j === 0 ? shut(1) : shut(2)); }
  }
  function drawDoor(p, x, y, kind, dbl, Wl){
    // porta di legno a pannelli con maniglia; nel negozio a vetri; doppia: due ante affiancate
    const l = dbl === 'R' ? 0 : 3, r = dbl === 'L' ? 16 : 13, t = 2;
    for (let j = t - 1; j < 16; j++) for (let i = l - 1; i <= r; i++){
      if (i < 0 || i > 15) continue;
      let c;
      if (j === t - 1 || (i === l - 1 && dbl !== 'R') || (i === r && dbl !== 'L')) c = C.ol0;
      else if (kind === 'shop' && j < 10) c = (i === l || i === r - 1 || j === t) ? C.wd4 : (i - j + 20) % 5 < 2 ? C.wi0 : C.wi2;
      else { const pi = (i - l) % 6, pj = (j - t) % 7; c = pj === 0 || pi === 0 ? C.wd4 : pi === 5 || pj === 6 ? C.wd4 : C.wd2; if (pi === 1 && pj !== 0 && pj !== 6) c = C.wd3; }
      if (j === 15) c = C.ol0;
      p(x + i, y + j, c);
    }
    const kx = dbl === 'L' ? 14 : dbl === 'R' ? 1 : 11;
    p(x + kx, y + 9, C.li1); p(x + kx, y + 10, C.li1);
  }
  function drawSign(p, x, y, kind, R){
    // insegna sopra la porta: pozione per il negozio, letto per la locanda
    const w = 18, h = 10;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p(x + i, y + j, j === 0 || j === h - 1 || i === 0 || i === w - 1 ? C.ol0 : j === 1 ? R(0) : j === h - 2 ? R(3) : R(2));
    const icon = kind === 'shop' ? ['..ww..', '..ww..', '.wrrw.', 'wrrrrw', 'wrrrrw', '.wwww.'] : ['w.....', 'w.ww..', 'wwwwww', 'wyyyyw', 'w....w', '......'];
    icon.forEach((r, j)=>[...r].forEach((ch, i)=>{ if (ch !== '.') p(x + 6 + i, y + 2 + j, ch === 'w' ? C.wi0 : ch === 'r' ? C.fl0 : C.li1); }));
  }
  function drawChurch(b){
    // chiesa: facciata di pietra a capanna, rosone, portale ad arco, croce in cima
    const { x0, y0, x1, y1 } = b;
    const fw = x1 - x0 + 1, fh = y1 - y0 + 1, X = x0 * 16, Y = y0 * 16, Wp = fw * 16, Hp = fh * 16;
    const p = brush(x0, y0, fw, fh);
    const peak = fw === 1 ? -6 : -12, eave = 8;   // la punta non sale oltre la casella sopra
    for (let y = 0; y < Hp; y++) for (let x = Wp; x < Wp + 3; x++){ const g = gget(X + x, Y + y); if (g === C.g2 || g === C.g1 || g === C.g3) gset(X + x, Y + y, C.g4); else if (g === C.pv1 || g === C.pv0 || g === C.pv2) gset(X + x, Y + y, C.pv3); }
    for (let y = peak; y < Hp; y++) for (let x = 0; x < Wp; x++){
      // timpano triangolare sopra la gronda
      const half = Wp / 2, gableY = eave - (half - Math.abs(x + 0.5 - half)) * ((eave - peak) / half);
      if (y < gableY - 2) continue;
      let c;
      if (y < gableY) c = y < gableY - 1 ? C.ol0 : C.r_slate0;                   // cornice del timpano
      else if (y < eave + 1 && y >= gableY) c = ((x + y) % 4 === 0) ? C.st1 : C.st0;
      else c = ((y >> 2) + (x >> 3)) & 1 ? C.st1 : C.st2;
      if (y > eave && (y & 3) === 0) c = C.st3;                                  // corsi di pietra
      if (y >= eave && y <= eave + 1) c = y === eave ? C.st4 : C.st3;            // cornicione
      if (x === 0 || x === Wp - 1) c = y < gableY ? c : C.st5;
      if (y >= Hp - 2) c = y === Hp - 1 ? C.ol0 : C.st4;
      p(X + x, Y + y, c);
    }
    // rosone
    const rx = X + Wp / 2 - 0.5, ry = Y + (fw === 1 ? -2 : 0) + (eave - 12) / 2;
    for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++){
      const d = Math.hypot(i, j); if (d > 5.2) continue;
      let c = d > 4.3 ? C.ol0 : d < 1.2 ? C.li1 : ((Math.atan2(j, i) * 4 / Math.PI + 8) | 0) % 2 ? C.fl5 : C.r_blue1;
      if (d > 3.5 && d <= 4.3) c = C.st0;
      p(Math.round(rx + i), Math.round(ry + j), c);
    }
    // croce sulla punta
    for (let j = 0; j < 5; j++) p(X + Wp / 2 - 1, Y + peak - 4 + j, C.li1), p(X + Wp / 2, Y + peak - 4 + j, C.li2);
    for (let i = -2; i <= 1; i++) p(X + Wp / 2 + i, Y + peak - 3, C.li1);
    // portale ad arco
    for (const d of b.doors){
      const dx = X + (d.x - x0) * 16, top = Hp - 16 - 2;
      for (let j = 0; j < 18; j++) for (let i = 1; i < 15; i++){
        const cxr = 7.5, archy = top + 6; const yy = top + j;
        if (yy < archy && Math.hypot(i - cxr, yy - archy) > 7) continue;
        const edge = yy < archy ? Math.hypot(i - cxr, yy - archy) > 5.8 : (i < 3 || i > 12);
        p(dx + i, Y + yy, edge ? (Math.hypot(i - cxr, yy - archy) > 6.6 && yy < archy ? C.ol0 : C.st4) : (i === 7 || i === 8) ? C.wd5 : ((yy - top) % 5 === 0) ? C.wd3 : i < 8 ? C.wd2 : C.wd3);
      }
      p(dx + 6, Y + Hp - 7, C.li1); p(dx + 9, Y + Hp - 7, C.li1);
      for (let x = 1; x < 15; x++){ gset(dx + x, Y + Hp, C.st1); gset(dx + x, Y + Hp + 1, C.st3); }
    }
    // finestre ad arco strette ai lati della porta
    for (let i = 0; i < fw; i++){
      if (b.doors.some(d=>d.x - x0 === i)) continue;
      const wx = X + i * 16 + 5, wy = Y + eave + 6;
      for (let j = 0; j < Hp - eave - 12; j++) for (let k = 0; k < 6; k++){
        if (j === 0 && (k === 0 || k === 5)) continue;
        p(wx + k, wy + j, (k === 0 || k === 5 || j === 0 || j === Hp - eave - 13) ? C.ol0 : (k + j) % 5 === 1 ? C.fl5 : C.r_blue2);
      }
    }
  }
  function drawCastle(b){
    // castello (Jerago): mura di pietra merlate e portone
    const { x0, y0, x1, y1 } = b;
    const fw = x1 - x0 + 1, fh = y1 - y0 + 1, X = x0 * 16, Y = y0 * 16, Wp = fw * 16, Hp = fh * 16;
    const p = brush(x0, y0, fw, fh);
    for (let y = -6; y < Hp; y++) for (let x = 0; x < Wp; x++){
      let c = ((((y + 16) >> 2) + ((x + ((y + 16) >> 2) * 3) >> 3)) & 1) ? C.st2 : C.st1;
      if (((y + 16) & 3) === 3 || ((x + (((y + 16) >> 2) & 1) * 4) & 7) === 0) c = C.st3;
      if (y < 0){ const m = (x >> 2) & 1; if (m && y < -2) continue; c = y === -6 || (y === -3 && !m) ? C.ol0 : C.st0; if (y > -3 && y < 0) c = y === -1 ? C.st4 : C.st1; }
      if (x === 0 || x === Wp - 1) c = C.ol0;
      if (y >= Hp - 2) c = y === Hp - 1 ? C.ol0 : C.st4;
      p(X + x, Y + y, c);
    }
    for (let i = 0; i < fw; i++) if (!b.doors.some(d=>d.x - x0 === i) && i !== 0 && i !== fw - 1){ const wx = X + i * 16 + 6; for (let j = 0; j < 7; j++) for (let k = 0; k < 4; k++) p(wx + k, Y + 4 + j, k === 0 || k === 3 || j === 0 ? C.ol0 : C.ol1); }
    for (const d of b.doors){
      const dbl = b.doors.some(o=>o.x === d.x + 1) ? 'L' : b.doors.some(o=>o.x === d.x - 1) ? 'R' : '';
      drawDoor(p, X + (d.x - x0) * 16, Y + Hp - 16, 'castle', dbl);
    }
  }
  function drawTower(cx, cy, kind){
    // torre: campanile della chiesa, torre civica con orologio, torre del castello
    const p = brush(cx, cy, 1, 1), X = cx * 16, Y = cy * 16;
    const brick = kind === 'civica';
    const hTop = kind === 'castle' ? -22 : -40;
    for (let y = hTop; y < 16; y++) for (let x = 1; x < 15; x++){
      let c = brick ? (((y >> 2) + (x >> 2)) & 1 ? C.w_brick1 : C.w_brick2) : (((y >> 2) + (x >> 3)) & 1 ? C.st1 : C.st2);
      if ((y & 3) === 3) c = brick ? C.w_brick3 : C.st3;
      if (x === 1) c = brick ? C.w_brick0 : C.st0; if (x === 14) c = C.ol0;
      if (y === 15) c = C.ol0;
      p(X + x, Y + y, c);
    }
    if (kind === 'castle'){
      for (let x = 0; x < 16; x++) for (let y = hTop - 5; y < hTop + 1; y++){ const m = (x >> 2) & 1; if (m && y < hTop - 2) continue; p(X + x, Y + y, y === hTop - 5 || (y === hTop - 2 && !m) || x === 0 || x === 15 ? C.ol0 : C.st0); }
      for (let j = 0; j < 6; j++){ p(X + 7, Y + hTop + 8 + j, C.ol0); p(X + 8, Y + hTop + 8 + j, C.ol1); }
      return;
    }
    // cella campanaria o orologio
    const by = Y + hTop + 8;
    if (kind === 'campanile'){
      for (let j = 0; j < 10; j++) for (let i = 4; i < 12; i++){ const arch = j < 3 && Math.abs(i - 7.5) > j + 1.5; if (!arch) p(X + i, by + j, C.ol1); }
      for (let j = 3; j < 8; j++) for (let i = 6; i < 10; i++) if (Math.abs(i - 7.5) <= (j - 2) * 0.6 + 0.5) p(X + i, by + j, j === 7 ? C.li2 : C.li1);
    } else {
      for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++){ const d = Math.hypot(i, j); if (d <= 5.2) p(X + 8 + i, by + 5 + j, d > 4.2 ? C.ol0 : C.st0); }
      for (let k = 0; k < 4; k++){ p(X + 8, by + 5 - k, C.ol0); } for (let k = 0; k < 3; k++) p(X + 8 + k, by + 5, C.ol0);
    }
    // tetto a punta
    for (let y = hTop - 12; y < hTop + 1; y++) for (let x = 0; x < 16; x++){
      const half = (y - (hTop - 12)) * 8 / 12 + 0.5; if (Math.abs(x + 0.5 - 8) > half) continue;
      const edge = Math.abs(x + 0.5 - 8) > half - 1;
      p(X + x, Y + y, edge || y === hTop ? C.r_red4 : x < 8 ? C.r_red1 : C.r_red2);
    }
  }
  function drawSanctuary(x0, y0, fw, fh){
    // il santuario del Sacro Monte: timpano con croce dorata, quattro colonne con capitelli,
    // nicchie con statue, portale dorato ad arco, scalinata
    const X = x0 * 16, Y = y0 * 16, Wp = fw * 16, Hp = fh * 16, mid = Wp / 2;
    const P = (x, y, c)=>gset(X + x, Y + y, c);
    for (let y = 0; y < Hp; y++) for (let x = 0; x < Wp; x++){
      let c = ((y >> 2) + (x >> 3)) & 1 ? C.st1 : C.st2;              // conci di pietra
      if ((y & 3) === 3) c = C.st3;
      P(x, y, c);
    }
    // timpano (righe 0-7): triangolo chiaro con cornice scura
    for (let y = 0; y < 8; y++) for (let x = 0; x < Wp; x++){
      const half = y * (mid / 8) + 4;
      if (Math.abs(x + 0.5 - mid) > half) continue;
      const edge = Math.abs(x + 0.5 - mid) > half - 1.5;
      P(x, y, edge ? C.st4 : y === 7 ? C.st4 : C.wi0);
    }
    for (let x = 0; x < Wp; x++){ P(x, 8, C.ol0); P(x, 9, C.st0 ?? C.wi0); P(x, 10, C.st3); }   // architrave
    for (let j = 1; j < 7; j++){ P(mid - 1, j, C.li1); P(mid, j, C.li2); } for (let i = -2; i < 2; i++) P(mid + i, 3, C.li1);
    // colonne con capitelli e basi
    for (const cx of [3, 19, 41, 57]) for (let y = 11; y < Hp - 4; y++) for (let k = 0; k < 5; k++){
      let c = k === 0 ? C.wi0 : k === 4 ? C.st4 : k === 3 ? C.st3 : C.st1;
      if (y === 11 || y === Hp - 5) c = k === 4 ? C.st4 : C.wi0;       // capitello e base
      P(cx + k - 1, y, c);
    }
    // nicchie con statue tra le colonne esterne
    for (const nx of [10, 48]){
      for (let y = 13; y < 25; y++) for (let x = 0; x < 6; x++){ if (y < 15 && (x === 0 || x === 5)) continue; P(nx + x, y, x === 0 || x === 5 || y === 13 ? C.st4 : C.ol1); }
      const fig = ['..ww..', '.wwww.', '..ww..', '.wwww.', 'wwwwww', '.wwww.', '.w..w.', '.w..w.'];
      fig.forEach((r, j)=>[...r].forEach((ch, i)=>{ if (ch !== '.') P(nx + i, 15 + j, i < 3 ? C.wi0 : C.st2); }));
    }
    // portale dorato ad arco
    for (let y = 12; y < Hp - 4; y++) for (let x = mid - 9; x < mid + 9; x++){
      const dx = x + 0.5 - mid, dy = y - 19;
      if (dy < 0 && Math.hypot(dx, dy) > 8.5) continue;
      const rim = dy < 0 ? Math.hypot(dx, dy) > 7.3 : Math.abs(dx) > 7.3;
      P(x, y, rim ? C.ol0 : Math.abs(dx) < 1 ? C.wd5 : (y % 4 === 0) ? C.li2 : (x & 3) === 0 ? C.wd3 : C.li1);
    }
    P(mid - 3, 22, C.wi0); P(mid + 2, 22, C.wi0);
    // scalinata
    for (let y = Hp - 4; y < Hp; y++) for (let x = 0; x < Wp; x++) P(x, y, (y - (Hp - 4)) % 2 ? C.st3 : C.wi0);
    for (let y = 0; y < Hp; y++){ P(0, y, C.ol0); P(Wp - 1, y, C.ol0); }
  }

  // ================= interni =================
  function paintIndoor(){
    const kind = /^chiesa/.test(id) ? 'church' : /^negozio/.test(id) ? 'shop' : /^locanda/.test(id) ? 'inn' : id === 'accademia' ? 'academy' : 'house';
    const wall = c=>c === '#' || c === 'M' || c === '';
    const floorPx = (x, y)=>{
      const lx = x & 15, ly = y & 15;
      if (kind === 'shop'){ const a = ((x >> 3) + (y >> 3)) & 1; return (lx & 7) === 7 || (ly & 7) === 7 ? C.tl3 : a ? C.tl0 : C.tl1; }
      if (kind === 'church'){ const a = ((x >> 4) + (y >> 4)) & 1; return lx === 15 || ly === 15 ? C.st4 : a ? C.st1 : C.st2; }
      if (kind === 'academy'){ const a = ((x >> 4) + (y >> 4)) & 1; if (lx === 15 || ly === 15) return C.st3; if (lx === 0 || ly === 0) return C.wi0; return a ? C.st1 : ((lx + ly) % 11 === 0 ? C.wi0 : C.st2); }
      // parquet: assi orizzontali sfalsate
      const row = y >> 2, seam = ((x + (row % 4) * 5) % 16) === 0;
      if ((y & 3) === 3) return C.fw3; if (seam) return C.fw4; return (y & 3) === 0 ? C.fw0 : C.fw1;
    };
    for (let cy = 0; cy < Hc; cy++) for (let cx = 0; cx < Wc; cx++){
      const c = at(cx, cy);
      for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++){
        const x = cx * 16 + lx, y = cy * 16 + ly;
        let col;
        if (c === ' ') col = C.ol1;
        else if (wall(c)){
          const below = at(cx, cy + 1);
          if (below && !wall(below) && cy < Hc - 1){
            // parete di fondo: carta da parati a righe, zoccolo di legno, cornice in alto
            col = (lx % 8) < 4 ? C.wp0 : C.wp1;
            if (kind === 'church') col = ((ly >> 2) + (lx >> 3)) & 1 ? C.st0 : C.st1;
            if (kind === 'shop') col = ly < 8 ? C.r_blue1 : C.wp0;
            if (ly < 2) col = ly === 1 ? C.wt0 : C.wt1;
            if (ly >= 13) col = ly === 13 ? C.wd2 : ly === 15 ? C.wd5 : C.wd3;
            // finestre (case, locande, Accademia) e quadri sulla parete di fondo
            const under = at(cx, cy + 1), deco = cx % 4 === 1 && !'ZHK'.includes(under) && kind !== 'shop';
            if (deco && kind !== 'church' && lx >= 3 && lx <= 12 && ly >= 2 && ly <= 11){
              const win = (cx >> 2) % 2 === 0;
              if (lx === 3 || lx === 12 || ly === 2 || ly === 11) col = win ? C.wi0 : C.wd5;
              else if (win) col = lx === 7 || lx === 8 ? C.wi0 : (lx - ly + 16) % 5 < 2 ? C.wi1 : C.wi2;
              else col = ly > 7 ? C.g3 : ly > 5 ? C.g1 : C.wi2;       // paesaggio dipinto
            }
          } else {
            // sommità del muro: bordo scuro con filo di luce verso l'interno
            col = C.wt2;
            const inR = !wall(at(cx + 1, cy)), inL = !wall(at(cx - 1, cy)), inD = cy < Hc - 1 && !wall(at(cx, cy + 1)), inU = !wall(at(cx, cy - 1));
            if (inR && lx >= 13) col = lx === 15 ? C.wt0 : C.wt1;
            if (inL && lx <= 2) col = lx === 0 ? C.wt0 : C.wt1;
            if (inU && ly <= 2) col = ly === 0 ? C.wt0 : C.wt1;
            if (inD && ly >= 13) col = ly === 15 ? C.wt0 : C.wt1;
          }
        } else {
          col = floorPx(x, y);
          // ombra del muro sul pavimento
          if (wall(at(cx, cy - 1)) && ly < 3) col = ly === 0 ? C.fw4 : shadeFloor(col);
          if (wall(at(cx - 1, cy)) && lx < 2) col = shadeFloor(col);
        }
        gset(x, y, col);
      }
    }
    function shadeFloor(c){ const map = new Map([[C.fw0, C.fw2], [C.fw1, C.fw2], [C.fw2, C.fw3], [C.fw3, C.fw4], [C.tl0, C.tl2], [C.tl1, C.tl2], [C.st1, C.st3], [C.st2, C.st3]]); return map.get(c) ?? c; }
    // arredi: componenti di caselle uguali
    const done = new Set();
    for (let cy = 0; cy < Hc; cy++) for (let cx = 0; cx < Wc; cx++){
      const c = at(cx, cy);
      if (!'ZlOKHRD'.includes(c) || done.has(cx + ',' + cy)) continue;
      let w = 1, h = 1; while (at(cx + w, cy) === c) w++; while (at(cx, cy + h) === c) h++;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) done.add((cx + i) + ',' + (cy + j));
      const X = cx * 16, Y = cy * 16, Wp = w * 16, Hp = h * 16;
      const p = (x, y, col)=>gset(x, y, col);
      if (c === 'Z'){
        // libreria alta: sale sulla parete di fondo
        for (let y = -12; y < Hp; y++) for (let x = 1; x < Wp - 1; x++){
          let col = C.wd4;
          const sy = (y + 12) % 9;
          if (x === 1 || x === Wp - 2 || y === -12) col = C.wd5;
          else if (sy === 0) col = C.wd3;
          else if (y < Hp - 3){ const bk = ((x >> 1) * 7 + ((y + 12) / 9 | 0) * 3) % 6; col = bk === 5 ? C.wd5 : [C.bo0, C.bo1, C.bo2, C.bo3, C.bo4][bk]; if (sy === 1 && bk !== 5) col = C.wi0; }
          else col = y === Hp - 1 ? C.ol1 : C.wd3;
          p(X + x, Y + y, col);
        }
      } else if (c === 'l'){
        // letti singoli da una casella per due
        for (let i = 0; i < w; i++) for (let y = 0; y < Hp; y++) for (let x = 1; x < 15; x++){
          const bx = X + i * 16; let col;
          if (y < 4) col = y === 0 || x === 1 || x === 14 ? C.wd5 : C.wd3;                  // testiera
          else if (y < 10) col = x === 1 || x === 14 ? C.ol1 : y === 4 ? C.wi1 : (x > 3 && x < 12 && y < 9) ? C.wi0 : C.wi1; // cuscino
          else col = x === 1 || x === 14 || y === Hp - 1 ? C.bl3 : y === 10 ? C.wi0 : ((x + y) % 6 === 0) ? C.bl0 : x > 10 ? C.bl2 : C.bl1;
          p(bx + x, Y + y, col);
        }
      } else if (c === 'O'){
        // tavolo di legno con tovaglia o libri (scrivanie dell'Accademia)
        for (let y = 1; y < Hp; y++) for (let x = 1; x < Wp - 1; x++){
          let col;
          if (y < Hp - 5) col = x === 1 || x === Wp - 2 || y === 1 ? C.wd5 : y === 2 ? C.wd1 : (kind === 'inn' || kind === 'house') && x > 3 && x < Wp - 4 && y > 3 ? ((((x >> 1) + (y >> 1)) & 1) ? C.wi0 : C.cp1) : C.wd2;
          else if (y < Hp - 3) col = y === Hp - 5 ? C.wd5 : C.wd3;
          else col = (x < 4 || x > Wp - 5) ? C.wd4 : null;
          if (col != null) p(X + x, Y + y, col);
        }
        if (kind === 'academy') for (let k = 0; k < w; k++){ const bx = X + k * 16 + 4; for (let y = 4; y < 9; y++) for (let x = 0; x < 7; x++) p(bx + x, Y + y, x === 3 ? C.wd4 : y === 4 ? C.wi1 : C.wi0); }
        if (kind === 'church') for (let x = 2; x < Wp - 2; x++) for (let y = 4; y < Hp - 6; y += 6) p(X + x, Y + y, C.wd4);
      } else if (c === 'K'){
        // bancone con piano chiaro e pannelli; il registratore di cassa nel negozio
        for (let y = 0; y < Hp; y++) for (let x = 0; x < Wp; x++){
          let col = y < 5 ? (y === 0 ? C.ol1 : y < 3 ? (kind === 'shop' ? C.tl0 : C.wd1) : C.wd3) : y === Hp - 1 ? C.ol1 : ((x % 16) === 0 || (x % 16) === 15) ? C.wd4 : kind === 'shop' ? (y < 9 ? C.r_blue1 : C.r_blue2) : C.wd2;
          if (x === 0 || x === Wp - 1) col = C.ol1;
          p(X + x, Y + y, col);
        }
        if (kind === 'shop') for (let y = -5; y < 2; y++) for (let x = 3; x < 12; x++) p(X + x, Y + y, y === -5 || x === 3 || x === 11 ? C.ol1 : y < -2 ? C.mt0 : C.mt1);
        else for (let y = -3; y < 2; y++) for (let x = 20; x < 26; x++) p(X + x, Y + y, x === 20 || x === 25 || y === -3 ? C.wd5 : C.wd1);   // boccale
      } else if (c === 'H'){
        // altare con candele e croce sulla parete
        for (let y = 0; y < Hp - 2; y++) for (let x = 1; x < Wp - 1; x++) p(X + x, Y + y, y === 0 || x === 1 || x === Wp - 2 ? C.st4 : y < 3 ? C.wi0 : (x > Wp / 2 - 4 && x < Wp / 2 + 3 && y < 9) ? C.cp1 : C.st1);
        for (const cx2 of [4, Wp - 5]){ for (let y = -6; y < 0; y++) p(X + cx2, Y + y, C.wi0); p(X + cx2, Y - 8, C.li0); p(X + cx2, Y - 7, C.li1); }
        for (let y = -14; y < -2; y++) p(X + Wp / 2 - 1, Y + y, C.li1), p(X + Wp / 2, Y + y, C.li2);
        for (let x = -4; x < 4; x++) p(X + Wp / 2 + x, Y - 10, C.li1);
      } else if (c === 'R' || c === 'D'){
        // tappeto dell'ingresso
        for (let y = 2; y < Hp - 2; y++) for (let x = 1; x < Wp - 1; x++) p(X + x, Y + y, y === 2 || y === Hp - 3 || x === 1 || x === Wp - 2 ? C.cp3 : (y === 3 || y === Hp - 4 || x === 2 || x === Wp - 3) ? C.li1 : ((x + y) % 4 === 0 ? C.cp0 : C.cp1));
      }
    }
  }
}
