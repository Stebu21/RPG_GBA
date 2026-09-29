// Mappe: raccordi automatici dei tile, set di tile per mappa, attributi, trigger, aspetti degli NPC.
import { Img, hash2, rgb15, hex, cArray } from './pixel.mjs';
import { TILES, BG_PALS, PAL_INDEX } from './tiles.mjs';
import { characterFrames, characterPalette } from './chars.mjs';
import { HAND_MAPS, MAP_IDS, MAP, NPC, QUEST, EVENT, FLAG, ITEM, ZONE, CHARACTERS, CHAR_IDS, QUESTS, SHOPS, INN_PRICES, cstr } from './gen-common.mjs';

const BLOCKED = new Set(['d', '~', '^', 'T', '#', 'C', 'W', 'M', 'K', 'l', 'Z', 'O', 'H', 'P', ' ', 'G', 'Q', 'E', 'b', 'm', 'U']);
const BUILD = new Set(['#', 'D', 'C', 'd']);
const VARIED = new Set(['grass', 'tallgrass', 'flowers', 'path', 'road', 'paving', 'wgrass', 'wtall', 'tree', 'wroad', 'floor', 'rock']);
export const MUSIC = { title:0, world:1, town:2, dungeon:3, battle:4, boss:5, victory:6, ending:7 };
export const SHOP_IDS = Object.keys(SHOPS);

// nome del metatile per la casella (x, y) della mappa
function autotile(m, id, x, y){
  const at = (i, j)=>{ const r = m.tiles[j]; return !r || i < 0 || i >= r.length ? '' : r[i]; };
  const c = at(x, y), world = id === 'world', indoor = !!m.indoor || id === 'accademia';
  // Sacro Monte: il santuario sopra la piazzetta dell'ultimo scontro
  if (id === 'sacromonte' && x >= 7 && x <= 10 && y <= 1) return y === 0 ? 'croof' + (x === 7 ? 1 : x === 10 ? 2 : 0) : x === 7 || x === 10 ? 'tower' : 'gate';
  if (indoor){
    switch (c){
      case '#': case 'M': return at(x, y + 1) && !'#M'.includes(at(x, y + 1)) && y < m.tiles.length - 1 ? 'iwall' : 'iwalltop';
      case 'Z': return 'shelf'; case 'l': return 'bed'; case 'O': return 'table'; case 'K': return 'counter'; case 'H': return 'altar';
      case 'R': case 'D': return 'rug'; case ' ': return 'void';
      default: return 'floor';
    }
  }
  if (world){
    switch (c){
      case '^': return 'wmount'; case 'S': return 'wshrine'; case '=': return 'wroad'; case ',': return 'wtall';
      case 'T': return 'wtree'; case '~': return 'wwater'; case 'B': return 'wbridge';
      case '1': case '2': case '3': case '4': case '5': return 'wtown'; case 'A': return 'gate';
      default: return 'wgrass';
    }
  }
  if (BUILD.has(c)){
    // edificio: tetto se sotto c'è ancora edificio, facciata sull'ultima riga; estremità a sinistra/destra
    const side = (BUILD.has(at(x - 1, y)) ? 0 : 1) | (BUILD.has(at(x + 1, y)) ? 0 : 2);
    let church = false;                       // un blocco che contiene 'C' è una chiesa (tetto di pietra)
    for (let j = y - 3; j <= y + 3; j++) for (let i = x - 4; i <= x + 4; i++) if (at(i, j) === 'C') church = true;
    if (c === 'C') return 'church';
    const below = at(x, y + 1);
    if (BUILD.has(below)) return (church ? 'croof' : 'roof') + side;
    if (c === 'D' || c === 'd') return 'door' + side;
    return ((x + y) % 2 ? 'win' : 'wall') + side;
  }
  switch (c){
    case ',': return 'tallgrass'; case 'F': return 'flowers'; case ':': return 'paving'; case '=': return 'road';
    case 'T': return 'tree'; case 'B': return 'bridge'; case '^': return 'rock'; case 'E': return 'hedge';
    case 'P': return 'lamp'; case 'b': return 'bench'; case 'Q': return 'fountain'; case 'U': return 'statue';
    case 'm': return 'market'; case 'G': return 'gundam'; case 'W': return 'tower'; case 'A': return 'gate';
    case 'S': return 'gate'; case ' ': return 'void';
    case '~': {
      const wat = (i, j)=>'~B'.includes(at(i, j)) || at(i, j) === '';
      return `water${(wat(x, y - 1) ? 1 : 0) | (wat(x + 1, y) ? 2 : 0) | (wat(x, y + 1) ? 4 : 0) | (wat(x - 1, y) ? 8 : 0)}_0`;
    }
    default: return 'grass';
  }
}

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
  let maxTiles = 0;
  for (const id of MAP_IDS){
    const m = HAND_MAPS[id], H = m.tiles.length, W = Math.max(...m.tiles.map(r=>r.length));
    const metaKeys = [], metaIndex = new Map(), cells = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
      const name = autotile(m, id, x, y);
      const v = VARIED.has(name) ? (hash2(x, y, 7) * 4) | 0 : 0;
      const key = name + '#' + v;
      if (!metaIndex.has(key)){ metaIndex.set(key, metaKeys.length); metaKeys.push({ key, name, v, ch:m.tiles[y][x] || ' ' }); }
      cells.push(metaIndex.get(key));
    }
    // tile 8x8 senza doppioni; il secondo fotogramma dell'acqua in coda
    const tiles = [], tIndex = new Map(), meta = [], attr = [], anim = [];
    const addTile = buf=>{ const k = Buffer.from(buf).toString('hex'); if (!tIndex.has(k)){ tIndex.set(k, tiles.length); tiles.push(buf); } return tIndex.get(k); };
    const paint = name=>{ const img = new Img(16, 16); TILES[name].draw(img, 0, 0); return img; };
    for (const mk of metaKeys){
      const t = TILES[mk.name];
      if (!t) throw new Error('tile mancante ' + mk.name + ' in ' + id);
      const img = new Img(16, 16); t.draw(img, mk.v, mk.v * 3 + 1);
      const pal = PAL_INDEX[t.pal] + 1;              // tavolozza 0 = interfaccia
      for (const [tx, ty] of [[0, 0], [1, 0], [0, 1], [1, 1]]) meta.push(addTile(img.tile4(tx, ty)) | (pal << 12));
      let a = BLOCKED.has(mk.ch) || /^(croof|tower|gate)/.test(mk.name) ? 1 : 0;
      if (mk.ch === ',' && !m.town) a |= 2;
      if (mk.name.startsWith('water')) a |= 4;
      attr.push(a);
    }
    for (const [mi, mk] of metaKeys.entries()){
      if (!mk.name.startsWith('water')) continue;
      const f1 = new Img(16, 16); TILES[mk.name.replace('_0', '_1')].draw(f1, mk.v, mk.v * 3 + 1);
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([tx, ty], k)=>{
        const dst = meta[mi * 4 + k] & 1023, src = tiles.length; tiles.push(f1.tile4(tx, ty)); anim.push(dst, src);
      });
    }
    maxTiles = Math.max(maxTiles, tiles.length);
    if (tiles.length > 1000) throw new Error(`${id}: troppi tile (${tiles.length})`);
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
    const n = id.toUpperCase();
    c += cArray('u8', `CELLS_${n}`, cells);
    if (zones) c += cArray('u8', `ZONES_${n}`, zones);
    c += cArray('u16', `TILES_${n}`, tiles.flatMap(b=>{ const o = []; for (let i = 0; i < 32; i += 2) o.push(b[i] | (b[i + 1] << 8)); return o; }), 16);
    c += cArray('u16', `META_${n}`, meta, 16) + cArray('u8', `ATTR_${n}`, attr) + (anim.length ? cArray('u16', `ANIM_${n}`, anim) : '');
    c += `static const Trigger TRIG_${n}[] = {\n${trig.map(t=>`  {${t.type},${t.x},${t.y},${t.look},${t.a},${t.b},${t.need},${t.hide}}`).join(',\n') || '  {0}'}\n};\n`;
    const indoor = !!m.indoor || id === 'accademia';
    const flags = (m.town ? 1 : 0) | (indoor ? 2 : 0) | (id === 'world' ? 4 : 0);
    const zone = m.zone ? ZONE[m.zone] ?? 255 : 255;
    defs.push(`  { ${cstr(m.name)}, ${W}, ${H}, ${MUSIC[m.music] ?? 2}, ${zone}, ${flags}, ${indoor ? 0 : 1}, CELLS_${n}, ${zones ? 'ZONES_' + n : 'NULL'}, TILES_${n}, ${tiles.length}, META_${n}, ${metaKeys.length}, ATTR_${n}, ${anim.length ? 'ANIM_' + n : 'NULL'}, ${anim.length / 2}, TRIG_${n}, ${trig.length}, 0 }`);
  }
  c += `const MapDef MAPS[] = {\n${defs.join(',\n')}\n};\nconst u8 NUM_MAPS = ${MAP_IDS.length};\n`;
  // tavolozze BG: 0 interfaccia, poi quelle dei tile
  const pals = [BG_PALS.ui, ...Object.values(BG_PALS)].slice(0, 8);
  c += `const u16 BG_PALETTES[8][16] = {\n${pals.map(p=>'  {' + p.map(h=>'0x' + rgb15(hex(h)).toString(16)).join(',') + '}').join(',\n')}\n};\n`;
  console.log('mappe:', MAP_IDS.length, ' tile massimi per mappa:', maxTiles, ' forzieri:', CHESTS.length);
  return c;
}
export const CHESTS = [];

// sprite dei personaggi: 9 fotogrammi 16x32 (72 tile, in ordine 1D: ogni fotogramma 2x4 tile)
export function genLooks(){
  let c = '', list = [];
  LOOK_LIST.forEach((l, i)=>{
    const frames = characterFrames(l.look), pal = characterPalette(l.look, l.color);
    const data = [];
    for (const f of frames) for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 2; tx++){ const b = f.tile4(tx, ty); for (let k = 0; k < 32; k += 2) data.push(b[k] | (b[k + 1] << 8)); }
    c += cArray('u16', `LOOK_GFX_${i}`, data, 16) + cArray('u16', `LOOK_PAL_${i}`, pal.map(rgb15));
    list.push(`{ LOOK_GFX_${i}, LOOK_PAL_${i} }`);
  });
  c += `const Look LOOKS[] = { ${list.join(', ')} };\nconst u8 NUM_LOOKS = ${LOOK_LIST.length};\n`;
  return c;
}
