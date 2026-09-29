// Personaggi 16x32 in stile GBA: modelli a griglia per direzione (giù, su, lato) e passo,
// più le varianti (cappello di Ste, codino e barba di Riki, capelli lunghi, cappotto, spada).
import { Img, hex } from './pixel.mjs';

// indici della tavolozza OBJ di un personaggio
export const C = { OL:1, SK:2, SKD:3, EYE:4, WH:5, H:6, HD:7, SH:8, SHD:9, PA:10, PAD:11, BO:12, AC:13, X1:14, X2:15 };
const MAP = { O:C.OL, S:C.SK, s:C.SKD, E:C.EYE, W:C.WH, H:C.H, h:C.HD, C:C.SH, c:C.SHD, P:C.PA, p:C.PAD, B:C.BO, A:C.AC, X:C.X1, Y:C.X2 };

// 24 righe utili (in basso nel riquadro 16x32); le prime 8 restano per cappelli e codini
const DOWN = [
  '.....OOOOOO.....', '....OHHHHHHO....', '...OHHHHHHHHO...', '...OHHHHHHHHO...', '..OHHHhhhhHHHO..', '..OHhSSSSSShHO..',
  '..OHSSSSSSSSHO..', '..OSSESSSSESSO..', '..OSSESSSSESSO..', '..OsSSSSSSSSsO..', '...OsSSssSSsO...', '....OOSSSSOO....',
  '...OCCOSSOCCO...', '..OCCCCCCCCCCO..', '.OSOCCCCCCCCOSO.', '.OSOCcCCCCcCOSO.', '.OSOCCAAAACCOSO.', '..OOPPPPPPPPOO..',
  '...OPPPppPPPO...', '...OPPPOOPPPO...', '...OPPO..OPPO...', '...OBBO..OBBO...', '..OBBBO..OBBBO..', '..OOOO....OOOO..'];
const UP = [
  '.....OOOOOO.....', '....OHHHHHHO....', '...OHHHHHHHHO...', '...OHHHHHHHHO...', '..OHHHHHHHHHHO..', '..OHHHHHHHHHHO..',
  '..OHHHhhhhHHHO..', '..OHhhhhhhhhHO..', '..OHHHHHHHHHHO..', '..OsHHHHHHHHsO..', '...OsSSSSSSsO...', '....OOSSSSOO....',
  '...OCCOCCOCCO...', '..OCCCCCCCCCCO..', '.OSOCCCCCCCCOSO.', '.OSOCcCCCCcCOSO.', '.OSOCCAAAACCOSO.', '..OOPPPPPPPPOO..',
  '...OPPPppPPPO...', '...OPPPOOPPPO...', '...OPPO..OPPO...', '...OBBO..OBBO...', '..OBBBO..OBBBO..', '..OOOO....OOOO..'];
const SIDE = [
  '......OOOOOO....', '....OOHHHHHHO...', '...OHHHHHHHHHO..', '...OHHHHHHHHHO..', '..OHHHHHHhhHHO..', '..OSSSSShHHHHO..',
  '.OSSSSSSSHHHHO..', '.OSESSSSSSHHHO..', '.OSESSSSSSShHO..', '..OSSSSSSSSSO...', '..OsSsSSSSSO....', '...OOOSSSOO.....',
  '....OCCSSCO.....', '...OCCCCCCCO....', '...OCCSSCCCO....', '...OCcSScCCO....', '...OCAAAAACO....', '...OPPPPPPPO....',
  '...OPPPPPPO.....', '...OPPOOPPO.....', '...OPPOOPPO.....', '...OBBO.OBBO....', '..OBBBO.OBBBO...', '..OOOO..OOOO....'];
// gambe nei due passi (sostituiscono le ultime righe)
const LEGS = {
  down:[['...OPPPOOPPPO...', '...OPPO..OBBO...', '...OBBO...OO....', '..OBBBO.........', '..OOOO..........'],
        ['...OPPPOOPPPO...', '...OBBO..OPPO...', '....OO...OBBO...', '.........OBBBO..', '..........OOOO..']],
  side:[['...OPPOOPPO.....', '..OPPO..OPPO....', '.OBBO....OBBO...', 'OBBBO....OBBBO..', 'OOOO......OOOO..'],
        ['...OPPOOPPO.....', '....OPPPPO......', '....OBBBBO......', '...OBBBBBO......', '...OOOOOO.......']],
};

function frame(dir, step){
  const base = dir === 'down' ? DOWN : dir === 'up' ? UP : SIDE;
  const rows = base.slice();
  if (step){
    const legs = LEGS[dir === 'side' ? 'side' : 'down'][step - 1];
    for (let k = 0; k < 5; k++) rows[19 + k] = legs[k];
  }
  return rows;
}

// varianti di aspetto sopra la base (coordinate nel riquadro 16x32, y0 = 8 è la cima della testa)
function decorate(img, look, dir, step){
  const y0 = 8 + (step ? -1 : 0), side = dir === 'side';
  const px = (x, y, c)=>img.set(x, y0 + y, c);
  if (look.hairStyle === 'quiff'){               // ciuffo spazzolato all'insù
    for (const [x, y] of side ? [[6,-1],[7,-2],[8,-1],[9,-2],[10,-1]] : [[6,-1],[7,-2],[8,-2],[9,-1],[5,0],[10,0]]) px(x, y, C.OL);
    for (const [x, y] of side ? [[7,-1],[8,0],[9,-1]] : [[7,-1],[8,-1],[6,0],[9,0]]) px(x, y, C.H);
  }
  if (look.hairStyle === 'tied'){                // codino da samurai sulla nuca
    const kx = dir === 'up' ? 7 : side ? 11 : 7;
    for (const [x, y] of [[kx, -3], [kx + 1, -3], [kx - 1, -2], [kx + 2, -2], [kx - 1, -1], [kx + 2, -1]]) px(x, y, C.OL);
    for (const [x, y] of [[kx, -2], [kx + 1, -2], [kx, -1], [kx + 1, -1]]) px(x, y, C.H);
    px(kx, 0, C.AC); px(kx + 1, 0, C.AC);
  }
  if (look.longHair && dir !== 'up'){            // capelli lunghi ai lati del viso
    for (let y = 5; y < 13; y++){ if (!side) { px(2, y, C.OL); px(3, y, C.H); px(12, y, C.H); px(13, y, C.OL); } else { px(12, y, C.H); px(13, y, C.OL); } }
  }
  if (look.longHair && dir === 'up') for (let y = 9; y < 14; y++) for (let x = 4; x < 12; x++) px(x, y, y === 13 ? C.OL : C.H);
  if (look.beard && dir !== 'up'){               // barba: sotto il mento, lunga per Riki
    const rows = look.beard >= 3 ? [9, 10, 11] : [9, 10];
    for (const y of rows) for (let x = side ? 2 : 4; x < (side ? 8 : 12); x++) if (img.get(x, y0 + y) === C.SK || img.get(x, y0 + y) === C.SKD) px(x, y, C.HD);
    if (look.beard >= 3 && !side){ px(6, 12, C.HD); px(7, 12, C.HD); px(8, 12, C.HD); px(9, 12, C.HD); px(7, 13, C.HD); px(8, 13, C.HD); }
  }
  if (look.outfit === 'mage'){                    // fedora con fascia viola e cappotto lungo
    const hy = -3;
    for (let x = 3; x < 13; x++){ px(x, hy + 3, C.OL); }
    for (let x = 1; x < 15; x++) px(x, hy + 4, x === 1 || x === 14 ? C.OL : C.X1);
    for (let x = 1; x < 15; x++) px(x, hy + 5, C.OL);
    for (let y = hy; y < hy + 3; y++) for (let x = 4; x < 12; x++) px(x, y, x === 4 || x === 11 || y === hy ? C.OL : C.X1);
    for (let x = 5; x < 11; x++) px(x, hy + 2, C.AC);
    // cappotto: scende fino alle ginocchia
    for (let y = 17; y < 20; y++) for (let x = 3; x < 13; x++){ const c = img.get(x, y0 + y); if (c === C.PA || c === C.PAD) px(x, y, (x === 3 || x === 12) ? C.OL : C.SH); }
    if (!side) for (let y = 17; y < 20; y++){ px(8, y, C.SHD); }
    // bastone con cristallo nella mano destra
    const sx = side ? 3 : 14, top = 4;
    for (let y = top; y < 23; y++) img.set(sx, y0 + y, C.X2);
    img.set(sx, y0 + top - 1, C.AC); img.set(sx - 1, y0 + top, C.AC); img.set(sx + 1, y0 + top, C.AC); img.set(sx, y0 + top - 2, C.WH);
  }
  if (look.outfit === 'samurai'){                // bavero bianco a V, obi rosso, katana al fianco
    if (dir !== 'up'){ px(6, 12, C.WH); px(9, 12, C.WH); px(7, 13, C.WH); px(8, 14, C.WH); px(7, 14, C.WH); }
    const kx = side ? 12 : 13;
    for (let y = 13; y < 21; y++) img.set(kx + (y > 16 ? 1 : 0), y0 + y - 1, C.X2);
    img.set(kx - 1, y0 + 14, C.AC);
  }
}

// un personaggio completo: 9 fotogrammi 16x32 (giù, su, lato) x (fermo, passo 1, passo 2)
export function characterFrames(look){
  const frames = [];
  for (const dir of ['down', 'up', 'side']) for (const step of [0, 1, 2]){
    const img = new Img(16, 32);
    img.grid(frame(dir, step), MAP, 0, 8 + (step ? -1 : 0));
    decorate(img, look, dir, step);
    frames.push(img);
  }
  return frames;
}

// tavolozza OBJ del personaggio dai colori del gioco web
const shade = (h, f)=>{ const [r, g, b] = hex(h); return f < 0 ? [r * (1 + f), g * (1 + f), b * (1 + f)].map(Math.round) : [r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f].map(Math.round); };
export function characterPalette(look, color){
  const shirt = look.outfit === 'mage' ? '#3a3450' : look.outfit === 'samurai' ? '#2c303c' : color;
  const pants = look.outfit === 'samurai' ? '#1c1e2a' : look.pants || '#3a4060';
  const skin = look.skin || '#f8c898';
  return [[0, 0, 0], [24, 20, 28], hex(skin), shade(skin, -0.22), [28, 28, 56], [248, 248, 248],
    hex(look.hair || '#3b2c20'), shade(look.hair || '#3b2c20', -0.35), hex(shirt), shade(shirt, -0.3), hex(pants), shade(pants, -0.3),
    [80, 56, 40], look.outfit === 'samurai' ? [200, 40, 48] : hex(color), look.outfit === 'mage' ? [36, 32, 48] : [200, 200, 210], look.outfit === 'mage' ? [60, 64, 80] : [210, 220, 235]];
}
