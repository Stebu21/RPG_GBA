// Personaggi 16x32 in stile Pokémon Rubino/Zaffiro: modelli "a riempimento" (senza contorno) per
// direzione e passo, varianti di capelli, barba, abiti, poi un contorno scuro automatico attorno alla sagoma.
import { Img, hex } from './pixel.mjs';

// indici della tavolozza OBJ di un personaggio
export const C = { OL:1, SK:2, SKD:3, EYE:4, WH:5, HL:6, H:7, HD:8, SL:9, SH:10, SHD:11, PA:12, PAD:13, AC:14, X:15 };
const MAP = { o:C.OL, S:C.SK, s:C.SKD, e:C.EYE, w:C.WH, H:C.HL, h:C.H, d:C.HD, L:C.SL, c:C.SHD, C:C.SH, P:C.PA, p:C.PAD, A:C.AC, B:C.X };

// 24 righe (in basso nel riquadro 16x32). Luce da sinistra: toni chiari a sinistra, scuri a destra.
const DOWN = [
  '................',
  '.....hhHHhh.....',
  '....hHHhhhhd....',
  '...hHhhhhhhhd...',
  '...hhhhhhhhhd...',
  '...hhhhhhhhdd...',
  '...hdSSSSSSdd...',
  '...dSSSSSSSSd...',
  '...SSeSSSSeSs...',
  '...SSeSSSSeSs...',
  '...sSSSSSSSss...',
  '....sSSSSSSs....',
  '.....ssSSss.....',
  '....LCCSSCCc....',
  '...LLCCCCCCcc...',
  '..SLLCCCCCCccs..',
  '..SLCCCCCCCCcs..',
  '..SLCCCCCCCCcs..',
  '..ss.AAAAAA.ss..',
  '....PPPPPPPp....',
  '....PPPppPPp....',
  '....PPp..PPp....',
  '....BBB..BBB....',
  '................'];
const UP = [
  '................',
  '.....hhHHhh.....',
  '....hHHhhhhd....',
  '...hHhhhhhhhd...',
  '...hhhhhhhhhd...',
  '...hhhhhhhhhd...',
  '...hhhhhhhhhd...',
  '...hhhhhhhhdd...',
  '...hhhhhhhhdd...',
  '...dhhhhhhhdd...',
  '...sddhhhhdds...',
  '....sddddddS....',
  '.....sSSSSs.....',
  '....LCCCCCCc....',
  '...LLCCCCCCcc...',
  '..SLLCCCCCCccs..',
  '..SLCCCCCCCCcs..',
  '..SLCCCCCCCCcs..',
  '..ss.AAAAAA.ss..',
  '....PPPPPPPp....',
  '....PPPppPPp....',
  '....PPp..PPp....',
  '....BBB..BBB....',
  '................'];
// di lato, rivolto a sinistra (a destra: specchiato)
const SIDE = [
  '................',
  '.....hhHHhh.....',
  '....hHHhhhhd....',
  '...hHhhhhhhhd...',
  '...hhhhhhhhhd...',
  '...SShhhhhhhd...',
  '..SSSShhhhhhd...',
  '..SSSSSdhhhdd...',
  '..SeSSSSdhhdd...',
  '..SeSSSSSdhdd...',
  '.SSSSSSSSsdd....',
  '...sSSSSSss.....',
  '.....sSSss......',
  '.....LCCCCc.....',
  '....LLCCCCcc....',
  '....LLCCCCcc....',
  '....SLCCCCcc....',
  '....SsCCCCcc....',
  '.....AAAAAA.....',
  '.....PPPPPp.....',
  '.....PPPPPp.....',
  '.....PPp.Pp.....',
  '.....BBB.BB.....',
  '................'];
// gambe e braccia nei due passi (righe 15-22)
const STEP = {
  down:[
    ['..SLLCCCCCCccs..', '..SLCCCCCCCCcs..', '...LCCCCCCCCcs..', '...ssAAAAAA.ss..', '....PPPPPPPp....', '....PPPppPPp....', '....PPp..BBB....', '....BBB.........'],
    ['..SLLCCCCCCccs..', '..SLCCCCCCCCcs..', '..SLCCCCCCCCc...', '..ss.AAAAAAss...', '....PPPPPPPp....', '....PPPppPPp....', '....BBB..PPp....', '.........BBB....']],
  side:[
    ['....LLCCCCcc....', '....SLCCCCcc....', '...SsLCCCCcc....', '.....AAAAAA.....', '.....PPPPPPp....', '....PPp..PPp....', '...PPp....PPp...', '...BBB....BBB...'],
    ['....LLCCCCcc....', '....LLCCCCSs....', '....LCCCCCcS....', '.....AAAAAA.....', '.....PPPPPp.....', '......PPPp......', '......PPPp......', '......BBBB......']],
};

function frameRows(dir, step){
  const rows = (dir === 'down' ? DOWN : dir === 'up' ? UP : SIDE).slice();
  if (step){ const s = STEP[dir === 'side' ? 'side' : 'down'][step - 1]; for (let k = 0; k < 8; k++) rows[15 + k] = s[k]; }
  return rows;
}

// varianti sopra il modello (coordinate nel riquadro 16x32; y0 = cima della testa)
function decorate(img, look, dir, y0){
  const side = dir === 'side', up = dir === 'up';
  const px = (x, y, c)=>img.set(x, y0 + y, c);
  const get = (x, y)=>img.get(x, y0 + y);
  const isHair = c=>c === C.HL || c === C.H || c === C.HD;
  // calvo: la calotta diventa pelle; stempiato: pelle solo in cima
  if (look.bald || look.baldTop){
    for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++){
      const c = get(x, y); if (!isHair(c)) continue;
      if (look.baldTop && (y > 3 || (!up && y > 2))) continue;
      px(x, y, c === C.HD ? C.SKD : C.SK);
    }
    if (!up) { px(5, 1, C.WH); px(6, 1, C.WH); px(5, 2, C.WH); }   // riflesso sulla testa
  }
  if (look.longHair){
    // capelli lunghi sulle spalle
    if (up){ for (let y = 10; y < 16; y++) for (let x = 4; x < 12; x++) px(x, y, x < 6 ? C.H : x > 9 ? C.HD : C.H); for (let x = 5; x < 11; x++) px(x, 16, C.HD); }
    else if (side){ for (let y = 6; y < 15; y++){ px(9, y, C.H); px(10, y, C.HD); px(11, y, C.HD); } px(10, 15, C.HD); }
    else for (let y = 6; y < 14; y++){ px(2, y, C.H); if (y > 9) px(3, y, C.H); px(13, y, C.HD); if (y > 9) px(12, y, C.HD); }
  }
  if (look.hairStyle === 'quiff'){               // ciuffo spazzolato all'insù
    for (const [x, y, c] of side ? [[4, 0, C.H], [5, 0, C.HL], [4, -1, C.HL], [5, -1, C.H], [3, 1, C.H]] : [[6, 0, C.HL], [7, 0, C.HL], [8, 0, C.H], [6, -1, C.H], [7, -1, C.HL], [5, 1, C.HL]]) px(x, y, c);
  }
  if (look.hairStyle === 'tied'){                // codino da samurai sulla nuca, legato di rosso
    const kx = side ? 9 : 7;
    for (const [x, y, c] of [[kx, -3, C.H], [kx + 1, -3, C.HD], [kx, -2, C.HL], [kx + 1, -2, C.H], [kx - 1, -2, C.H], [kx + 2, -2, C.HD]]) px(x, y, c);
    px(kx, -1, C.AC); px(kx + 1, -1, C.AC); px(kx, 0, C.H); px(kx + 1, 0, C.HD);
  }
  if (look.beard && !up){                        // barba: dal mento sulle guance; lunga per Riki
    const rows = look.beard >= 2 ? [9, 10, 11, 12] : [10, 11];
    for (const y of rows) for (let x = side ? 1 : 3; x < (side ? 9 : 13); x++){
      const c = get(x, y); if (c !== C.SK && c !== C.SKD) continue;
      if (look.beard === 1){ if ((x + y) % 2 === 0) px(x, y, C.SKD); if (y === 11) px(x, y, C.HD); }
      else px(x, y, y === 9 && !side && x > 4 && x < 11 ? C.SK : x < 7 ? C.H : C.HD);
    }
    if (look.beard >= 3){ for (let y = 12; y < 16; y++) for (let x = side ? 2 : 5; x < (side ? 6 : 11) - (y > 13 ? 1 : 0) + (y > 13 && !side ? 0 : 0); x++) px(x + (y > 13 && !side ? 1 : 0), y, x < 7 ? C.H : C.HD); }
  }
  if (look.outfit === 'mage'){
    // fedora con fascia viola: tesa larga e cupola
    for (let y = -3; y < 5; y++) for (let x = 0; x < 16; x++){
      const brim = y === 3 || y === 4, crown = y < 3 && x >= 4 && x <= 11;
      if (side ? (brim && x >= 1 && x <= 13) || (y < 3 && x >= 3 && x <= 11) : (brim && x >= 1 && x <= 14) || crown){
        let c = y === -3 ? C.X : x < 6 ? C.SL : C.X;
        if (y === 2) c = C.AC;
        if (y === 4) c = C.SHD;
        if (y === 3) c = x < 5 ? C.SL : C.X;
        px(x, y, c);
      }
    }
    for (let y = 5; y < 7; y++) for (let x = 0; x < 16; x++) if (isHair(get(x, y)) && !up) px(x, y, y === 5 ? C.HD : get(x, y));
    // cappotto lungo fino alle ginocchia
    for (let y = 19; y < 21; y++) for (let x = 0; x < 16; x++){ const c = get(x, y); if (c === C.PA || c === C.PAD) px(x, y, c === C.PAD ? C.SHD : x < 6 ? C.SL : C.SH); }
    if (!side && !up){ for (let y = 13; y < 21; y++) if (get(8, y) === C.SH || get(8, y) === C.SL) px(8, y, C.SHD); px(7, 13, C.WH); px(8, 13, C.WH); }
    // bastone con cristallo nella mano destra
    const sx = side ? 3 : up ? 2 : 13;
    for (let y = 4; y < 23; y++) px(sx, y, y % 5 === 0 ? C.HD : C.H);
    px(sx, 2, C.WH); px(sx, 3, C.AC); px(sx - 1, 3, C.AC); px(sx + 1, 3, C.AC); px(sx, 1, C.AC);
  }
  if (look.outfit === 'samurai'){
    // kimono con bavero bianco a V, obi rosso, katana al fianco
    if (!up && !side){ for (const [x, y] of [[6, 13], [9, 13], [6, 14], [9, 14], [7, 15], [8, 15]]) px(x, y, C.WH); px(7, 13, C.SK); px(8, 13, C.SK); px(7, 14, C.SKD); px(8, 14, C.SKD); }
    if (side){ px(5, 13, C.WH); px(5, 14, C.WH); px(6, 15, C.WH); }
    const kx = side ? 11 : up ? 3 : 12;
    for (let y = 15; y < 22; y++) px(kx + (y > 18 ? (side || up ? -1 : 1) : 0), y, y < 17 ? C.AC : C.X);
  }
  if (look.tattoo && !up){ px(side ? 5 : 2, 16, C.PAD); px(side ? 5 : 2, 17, C.PAD); }
  const back = (x, y, c)=>{ if (!get(x, y)) px(x, y, c); };          // solo dove c'è sfondo: resta dietro al corpo
  if (look.outfit === 'fairy'){
    // ali di luce (dietro), gonnellina a petali, coroncina di fiori, bacchetta con la stella
    const wing = side ? [[10, 11], [11, 10], [12, 10], [12, 11], [13, 11], [11, 12], [12, 12], [13, 12], [14, 12], [11, 13], [12, 13], [13, 13], [12, 14], [11, 16], [12, 16], [12, 17], [11, 17]]
      : [[1, 9], [2, 9], [0, 10], [1, 10], [2, 10], [0, 11], [1, 11], [2, 11], [3, 11], [0, 12], [1, 12], [2, 12], [3, 12], [0, 13], [1, 13], [2, 13], [1, 14], [2, 14], [1, 16], [2, 16], [0, 17], [1, 17], [2, 17], [1, 18]];
    for (const [x, y] of wing){ back(x, y, (x + y) % 3 ? C.X : C.WH); if (!side) back(15 - x, y, (x + y) % 3 ? C.X : C.WH); }
    if (up) for (const [x, y] of [[4, 13], [5, 13], [3, 14], [4, 14], [11, 13], [10, 13], [12, 14], [11, 14], [4, 16], [11, 16]]) px(x, y, (x + y) % 2 ? C.X : C.WH);
    for (let y = 19; y < 21; y++) for (let x = side ? 5 : 4; x < (side ? 11 : 12); x++) px(x, y, y === 20 && x % 2 ? C.SHD : x < 6 ? C.SL : C.SH);
    for (const x of side ? [4, 11] : [3, 12]) back(x, 20, C.SH);
    for (let x = side ? 4 : 3; x < (side ? 12 : 13); x += 2) px(x, 1, x % 4 === 1 ? C.AC : C.WH);
    if (!up){ const wx = side ? 3 : 13; for (let y = 13; y < 19; y++) px(wx, y, C.WH); px(wx, 11, C.AC); px(wx - 1, 12, C.AC); px(wx + 1, 12, C.AC); px(wx, 12, C.WH); px(wx, 13, C.AC); }
  }
  if (look.outfit === 'smith'){
    // templare: cotta grigia, sopravveste bianca con la croce rossa, spalline d'acciaio, ascia forgiata da lui
    for (let y = 14; y < 22; y++) for (let x = side ? 5 : 5; x < (side ? 10 : 11); x++){ const c = get(x, y); if (c && c !== C.SK && c !== C.SKD && c !== C.OL) px(x, y, C.WH); }
    if (!up && !side){ for (let y = 14; y < 21; y++){ px(7, y, C.AC); px(8, y, C.AC); } for (let x = 5; x < 11; x++) px(x, 16, C.AC); }
    if (side){ for (let y = 14; y < 21; y++) px(7, y, C.AC); px(6, 16, C.AC); px(8, 16, C.AC); }
    for (const x of side ? [4, 9] : [2, 3, 12, 13]) if (get(x, 14)) px(x, 14, C.SL);
    const hx = side ? 3 : up ? 2 : 13;
    for (let y = 15; y < 23; y++) px(hx, y, C.X);
    for (const [x, y, c] of [[hx - 1, 14, C.SL], [hx, 14, C.SL], [hx + 1, 14, C.SL], [hx - 2, 15, C.SL], [hx - 1, 15, C.SL], [hx - 2, 16, C.SH], [hx - 1, 16, C.SH]]) px(x, y, c);
  }
  if (look.outfit === 'bard'){
    // berretto rosso con la piuma bianca, liuto a tracolla
    for (let x = side ? 3 : 3; x < (side ? 12 : 13); x++){ px(x, 0, C.AC); if (x > 3 && x < 12) px(x, -1, C.AC); }
    for (const [x, y] of side ? [[10, -2], [11, -3], [12, -4], [11, -2]] : [[11, -2], [12, -3], [13, -4], [12, -2]]) px(x, y, C.WH);
    if (up){ for (let y = 13; y < 19; y++) for (let x = 5; x < 11; x++) if (Math.hypot(x - 7.5, (y - 16) * 0.9) < 3.1) px(x, y, (x === 7 || x === 8) && y === 16 ? C.OL : C.X); for (let y = 9; y < 13; y++) px(8, y, C.HD); }
    else if (side){ for (let y = 9; y < 16; y++) back(11, y, C.HD); for (const [x, y] of [[11, 15], [12, 15], [11, 16], [12, 16], [12, 17], [11, 17]]) back(x, y, C.X); }
    else { for (let y = 7; y < 13; y++) back(13, y, C.HD); back(14, 6, C.HD); for (let y = 13; y < 18; y++) px(5 + (y - 13), y, C.HD); }
  }
  if (look.outfit === 'healer'){
    // veste bianca lunga, croce rossa sul petto, bastone di frassino con la gemma verde
    for (let y = 19; y < 22; y++) for (let x = 3; x < 13; x++){ const c = get(x, y); if (c === C.PA || c === C.PAD || (y === 21 && !c && x > 3 && x < 12 && !side)) px(x, y, x > 9 ? C.SHD : C.SH); }
    if (!up && !side){ px(7, 14, C.AC); px(8, 14, C.AC); px(7, 15, C.AC); px(8, 15, C.AC); px(6, 15, C.AC); px(9, 15, C.AC); px(7, 16, C.AC); px(8, 16, C.AC); }
    const sx = side ? 3 : up ? 2 : 13;
    for (let y = 5; y < 23; y++) px(sx, y, C.X);
    px(sx, 4, C.HL); px(sx, 3, C.HL); px(sx - 1, 4, C.AC); px(sx + 1, 4, C.AC);
  }
  if (look.outfit === 'botanist'){
    // cappello di paglia a tesa larga con nastro verde, grembiule verde, borsa con un germoglio
    for (let x = 0; x < 16; x++) if (!side || (x > 0 && x < 15)) { px(x, 3, C.X); if (x > 0 && x < 15) px(x, 4, x < 4 ? C.X : C.HD); }
    for (let y = -2; y < 3; y++) for (let x = 4; x < 12; x++) px(x, y, y === 2 ? C.AC : y === -2 && (x === 4 || x === 11) ? 0 : x < 6 ? C.WH : C.X);
    if (!up) for (let y = 15; y < 21; y++) for (let x = side ? 5 : 5; x < (side ? 10 : 11); x++){ const c = get(x, y); if (c && c !== C.SK && c !== C.SKD) px(x, y, (x + y) % 5 ? C.AC : C.PAD); }
    const bx = side ? 10 : up ? 11 : 2;
    for (let y = 17; y < 20; y++) for (let x = bx; x < bx + 3; x++) px(x, y, y === 17 ? C.HD : C.X);
    px(bx + 1, 16, C.AC); px(bx + 1, 15, C.AC); px(bx + 2, 15, C.AC);
  }
}

// contorno scuro automatico attorno alla sagoma (come negli sprite GBA)
function outline(img){
  const add = [];
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++){
    if (img.get(x, y)) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy])=>{ const c = img.get(x + dx, y + dy); return c && c !== C.OL; })) add.push([x, y]);
  }
  for (const [x, y] of add) img.set(x, y, C.OL);
}

// un personaggio completo: 9 fotogrammi 16x32 (giù, su, lato) x (fermo, passo 1, passo 2)
export function characterFrames(look){
  const frames = [];
  for (const dir of ['down', 'up', 'side']) for (const step of [0, 1, 2]){
    const img = new Img(16, 32);
    let rows = frameRows(dir, step);
    if (look.h === 'short') rows = ['................', ...rows.slice(0, 15), ...rows.slice(16)];     // busto più corto
    const y0 = 7 + (step ? -1 : 0) + (look.h === 'short' ? 0 : 0);
    img.grid(rows, MAP, 0, y0);
    if (look.build === 'wide') for (let y = y0 + 14; y < y0 + 19; y++){ for (const [x, nx] of dir === 'side' ? [[4, 3], [11, 12]] : [[2, 1], [13, 14]]) { const c = img.get(x, y); if (c && c !== C.OL) img.set(nx, y, c === C.SK || c === C.SKD ? c : c); } }
    decorate(img, look, dir, y0 + 1);
    outline(img);
    frames.push(img);
  }
  return frames;
}

// tavolozza OBJ del personaggio dai colori del gioco web
const shade = (h, f)=>{ const [r, g, b] = typeof h === 'string' ? hex(h) : h; return f < 0 ? [r * (1 + f), g * (1 + f), b * (1 + f)].map(Math.round) : [r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f].map(Math.round); };
// colori di abito, accessorio (AC) ed extra (X) per ogni mestiere
const OUTFIT = {
  fairy:    c=>({ shirt:c, ac:'#ff90c8', x:shade(c, 0.62) }),
  smith:    ()=>({ shirt:'#8a919b', ac:'#c02828', x:'#7a4a2a' }),
  bard:     c=>({ shirt:c, ac:'#b02838', x:'#c07838' }),
  healer:   ()=>({ shirt:'#f0eee6', ac:'#d83030', x:'#c8a068' }),
  botanist: ()=>({ shirt:'#c0392b', ac:'#3f9a48', x:'#e8c878' }),
};
export function characterPalette(look, color){
  const of = OUTFIT[look.outfit]?.(color);
  const shirt = of ? of.shirt : look.outfit === 'mage' ? '#4a4068' : look.outfit === 'samurai' ? '#3a3e4e' : color;
  const pants = look.outfit === 'samurai' ? '#24263a' : look.pants || '#3c4468';
  const skin = look.skin || '#f8c8a0';
  let hair = look.hair || '#3b2c20';
  const [hr, hg, hb] = hex(hair); if (hr + hg + hb < 90) hair = '#2e2a30';     // i neri puri spariscono sul contorno
  const eye = look.outfit === 'samurai' || !look.eyes ? '#202030' : look.eyes;
  return [[0, 0, 0], [32, 24, 32], hex(skin), shade(skin, -0.2), hex(eye), [248, 248, 248],
    shade(hair, 0.28), hex(hair), shade(hair, -0.4), shade(shirt, 0.3), hex(shirt), shade(shirt, -0.32), hex(pants), shade(pants, -0.3),
    of ? hex(of.ac) : look.outfit === 'samurai' ? [216, 48, 56] : look.outfit === 'mage' ? hex(color) : [92, 60, 40],
    of ? (typeof of.x === 'string' ? hex(of.x) : of.x) : look.outfit === 'mage' ? [40, 34, 56] : look.outfit === 'samurai' ? [200, 206, 220] : [110, 72, 44]];
}
