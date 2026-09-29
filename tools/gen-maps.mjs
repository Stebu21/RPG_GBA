// Mappe: raccordi automatici dei tile, set di tile per mappa, attributi, trigger, aspetti degli NPC.
import { Img, hash2, rgb15, hex, cArray } from './pixel.mjs';
import { BG_PALS } from './tiles.mjs';
import { paintMap, BLOCKED } from './overworld.mjs';
import { convertLayers } from './gba-convert.mjs';
import { characterFrames, characterPalette } from './chars.mjs';
import { HAND_MAPS, MAP_IDS, MAP, NPC, QUEST, EVENT, FLAG, ITEM, ZONE, CHARACTERS, CHAR_IDS, QUESTS, SHOPS, INN_PRICES, cstr } from './gen-common.mjs';

export const MUSIC = { title:0, world:1, town:2, dungeon:3, battle:4, boss:5, victory:6, ending:7 };
export const SHOP_IDS = Object.keys(SHOPS);

// ---------- aspetti degli sprite: eroi (dal gioco) e NPC (ricavati dall'id) ----------
const HAIR = ['#2b1d14', '#4a3020', '#1a1a1a', '#6b4a2a', '#b08050', '#8a8a8a', '#3a2418'];
const h01 = (s, k)=>{ let h = 2166136261; for (const ch of s + ':' + k) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
export const LOOK_LIST = CHAR_IDS.map(id=>({ key:id, look:CHARACTERS[id].look, color:CHARACTERS[id].color }));
export function lookFor(key, color){
  let i = LOOK_LIST.findIndex(l=>l.key === key);
  if (i >= 0) return i;
  const female = h01(key, 'f') > 0.55;
  LOOK_LIST.push({ key, color:color || '#b08968', look:{ hair:HAIR[(h01(key, 'h') * HAIR.length) | 0], longHair:female, female, beard:!female && h01(key, 'b') > 0.7 ? 1 : 0,
    skin:['#f8c898', '#f0b888', '#d8a070', '#b88058'][(h01(key, 's') * 4) | 0], pants:['#3a4060', '#4a3828', '#303030', '#506070'][(h01(key, 'p') * 4) | 0] } });
  return LOOK_LIST.length - 1;
}

export function genMaps(){
  let c = '';
  const defs = [];
  let maxTiles = 0, maxPals = 0;
  for (const id of MAP_IDS){
    const m = HAND_MAPS[id], H = m.tiles.length, W = Math.max(...m.tiles.map(r=>r.length));
    const at = (x, y)=>(m.tiles[y] || '')[x] || ' ';
    // il santuario del Sacro Monte occupa le prime due righe della piazzetta
    const extraBlock = (x, y)=>id === 'sacromonte' && x >= 7 && x <= 10 && y <= 1;
    const blockedCells = new Set(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (extraBlock(x, y)) blockedCells.add(x + ',' + y);
    const portals = Object.fromEntries((m.triggers || []).filter(t=>t.type === 'portal').map(t=>[t.x + ',' + t.y, t.to.map]));
    const f0 = paintMap(id, m, 0, { portals, blockedCells }), f1 = paintMap(id, m, 1, { portals, blockedCells });
    const r = convertLayers([{ f0:f0.ground, f1:f1.ground }, { f0:f0.top, f1:f1.top }], W * 16, H * 16, { name:id, maxPals:15, maxTiles:1024 });
    maxTiles = Math.max(maxTiles, r.ntiles); maxPals = Math.max(maxPals, r.pals.length);
    const attr = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
      const ch = at(x, y);
      let a = BLOCKED.has(ch) || extraBlock(x, y) ? 1 : 0;
      if (ch === ',' && !m.town) a |= 2;
      if (ch === '~') a |= 4;
      attr.push(a);
    }
    // zone per casella (mappa del mondo)
    let zones = null;
    if (m.zones){ zones = new Array(W * H).fill(255); for (const z of m.zones) for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (x < W && y < H) zones[y * W + x] = ZONE[z.zone] ?? 255; }
    // trigger
    const trig = [];
    for (const t of m.triggers || []){
      const e = { type:0, x:t.x, y:t.y, look:0, a:0, b:0, need:0, hide:t.hideFlag ? FLAG[t.hideFlag] : 255 };
      if (t.type === 'portal'){ if (!(t.to.map in MAP)) continue; Object.assign(e, { type:1, a:MAP[t.to.map], b:t.to.x | (t.to.y << 8), need:t.needSigilli || 0 }); }
      else if (t.type === 'npc'){ if (!(t.npc in NPC)) continue; Object.assign(e, { type:2, a:NPC[t.npc], look:lookFor(t.npc, t.sprite) }); }
      else if (t.type === 'quest'){ Object.assign(e, { type:3, a:QUEST[t.quest], look:lookFor(t.quest, t.sprite) }); }
      else if (t.type === 'chest'){ if (!(t.item in ITEM)) continue; Object.assign(e, { type:4, a:CHESTS.length, b:ITEM[t.item] | ((t.qty || 1) << 8) }); CHESTS.push(t.id); }
      else if (t.type === 'door_event'){ Object.assign(e, { type:5, a:EVENT[t.event] }); }
      else if (t.type === 'event'){ Object.assign(e, { type:6, a:EVENT[t.event] }); }
      else if (t.type === 'shop'){ Object.assign(e, { type:7, a:SHOP_IDS.indexOf(t.shop) }); }
      else if (t.type === 'inn'){ Object.assign(e, { type:8, a:INN_PRICES[t.town] || 20 }); }
      else if (t.type === 'heal'){ e.type = 9; }
      else continue;
      trig.push(e);
    }
    // cavalcature da trovare, come nella versione web: l'asino a Castiglione, il cavallo nel castello di Jerago
    if (id === 'castiglione') trig.push({ type:10, x:22, y:5, look:0, a:1, b:0, need:0, hide:255 });
    if (id === 'jerago') trig.push({ type:10, x:11, y:5, look:0, a:2, b:0, need:0, hide:255 });
    const n = id.toUpperCase(), hasTop = r.maps[1].some(v=>v);
    if (zones) c += cArray('u8', `ZONES_${n}`, zones);
    c += cArray('u16', `TILES_${n}`, r.tiles, 16);
    c += cArray('u16', `BG_${n}`, r.maps[0], 16) + (hasTop ? cArray('u16', `TOP_${n}`, r.maps[1], 16) : '');
    c += cArray('u16', `PAL_${n}`, r.pals.flatMap(p=>{ const o = [...p]; while (o.length < 16) o.push(0); return o; }), 16);
    c += cArray('u8', `ATTR_${n}`, attr) + (r.anim.length ? cArray('u16', `ANIM_${n}`, r.anim) : '');
    c += `static const Trigger TRIG_${n}[] = {\n${trig.map(t=>`  {${t.type},${t.x},${t.y},${t.look},${t.a},${t.b},${t.need},${t.hide}}`).join(',\n') || '  {0}'}\n};\n`;
    const indoor = !!m.indoor || id === 'accademia';
    const flags = (m.town ? 1 : 0) | (indoor ? 2 : 0) | (id === 'world' ? 4 : 0);
    const zone = m.zone ? ZONE[m.zone] ?? 255 : 255;
    defs.push(`  { ${cstr(m.name)}, ${W}, ${H}, ${MUSIC[m.music] ?? 2}, ${zone}, ${flags}, BG_${n}, ${hasTop ? 'TOP_' + n : 'NULL'}, ${zones ? 'ZONES_' + n : 'NULL'}, TILES_${n}, ${r.ntiles}, PAL_${n}, ${r.pals.length}, ATTR_${n}, ${r.anim.length ? 'ANIM_' + n : 'NULL'}, ${r.anim.length / 2}, TRIG_${n}, ${trig.length}, 0 }`);
  }
  c += `const MapDef MAPS[] = {\n${defs.join(',\n')}\n};\nconst u8 NUM_MAPS = ${MAP_IDS.length};\n`;
  // tavolozza BG 0: interfaccia
  c += `const u16 BG_PALETTES[1][16] = {\n  {${BG_PALS.ui.map(h=>'0x' + rgb15(hex(h)).toString(16)).join(',')}}\n};\n`;
  console.log('mappe:', MAP_IDS.length, ' tile massimi:', maxTiles, ' tavolozze massime:', maxPals, ' forzieri:', CHESTS.length);
  return c;
}
export const CHESTS = [];

// sprite dei personaggi: 9 fotogrammi 16x32 (72 tile, in ordine 1D: ogni fotogramma 2x4 tile)
// Scale2x (EPX): raddoppia la pixel art arrotondando le diagonali invece di fare quadrettoni
export function scale2x(img){
  const o = new Img(img.w * 2, img.h * 2);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++){
    const P = img.get(x, y), A = img.get(x, y - 1), B = img.get(x + 1, y), Cc = img.get(x - 1, y), D = img.get(x, y + 1);
    o.set(x * 2, y * 2, Cc === A && Cc !== D && A !== B ? A : P);
    o.set(x * 2 + 1, y * 2, A === B && A !== Cc && B !== D ? B : P);
    o.set(x * 2, y * 2 + 1, D === Cc && D !== B && Cc !== A ? Cc : P);
    o.set(x * 2 + 1, y * 2 + 1, B === D && B !== A && D !== Cc ? D : P);
  }
  return o;
}
// dopo l'ingrandimento: contorno di nuovo sottile (un pixel verso l'esterno), riflesso bianco negli occhi,
// luce sul bordo sinistro dei volumi: più dettaglio, meno "pixel doppio"
export function refineBig(img){
  const o = img.clone(), OL = 1, EYE = 4, WH = 5;
  const tr = (x, y)=>img.get(x, y) === 0;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++){
    if (img.get(x, y) !== OL) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy])=>tr(x + dx, y + dy))) continue;   // bordo esterno: resta
    // contorno interno ereditato dal raddoppio: prende il colore del vicino all'interno
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy])=>img.get(x + dx, y + dy)).find(c=>c && c !== OL);
    if (n) o.set(x, y, n);
  }
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.get(x, y) === EYE && img.get(x, y - 1) !== EYE && img.get(x - 1, y) !== EYE) o.set(x, y, WH);
  return o;
}
export function genLooks(){
  let c = '', list = [];
  LOOK_LIST.forEach((l, i)=>{
    const frames = characterFrames(l.look), pal = characterPalette(l.look, l.color);
    const data = [];
    for (const f of frames) for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 2; tx++){ const b = f.tile4(tx, ty); for (let k = 0; k < 32; k += 2) data.push(b[k] | (b[k + 1] << 8)); }
    c += cArray('u16', `LOOK_GFX_${i}`, data, 16) + cArray('u16', `LOOK_PAL_${i}`, pal.map(rgb15));
    // eroi: fotogrammi 32x64 per la battaglia e la scelta (di fronte, di lato, di lato col passo), ingranditi con Scale2x
    let big = 'NULL';
    if (CHAR_IDS.includes(l.key)){
      const bd = [];
      for (const f of [frames[0], frames[6], frames[7]]){ const b2 = refineBig(scale2x(f)); for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 4; tx++){ const b = b2.tile4(tx, ty); for (let k = 0; k < 32; k += 2) bd.push(b[k] | (b[k + 1] << 8)); } }
      c += cArray('u16', `LOOK_BIG_${i}`, bd, 16); big = `LOOK_BIG_${i}`;
    }
    list.push(`{ LOOK_GFX_${i}, LOOK_PAL_${i}, ${big} }`);
  });
  c += `const Look LOOKS[] = { ${list.join(', ')} };\nconst u8 NUM_LOOKS = ${LOOK_LIST.length};\n`;
  return c;
}
