// Parti comuni del generatore: dati del gioco web, codifica del testo, flag, indici.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { GLYPHS, ALIAS } from './font.mjs';

export const WEB = 'C:/Users/StefanoBulgheroni/Documents/Stefano/RPG/www/js/';
const imp = f=>import('file:///' + WEB + f);
export const [{ CHARACTERS }, { MONSTERS, ZONES }, { ABILITIES, COMBOS }, { ITEMS, SHOPS, INN_PRICES }, { EQUIP, TOMES }, { NPCS, EVENTS }, { QUESTS }] =
  await Promise.all(['data/characters.js', 'data/monsters.js', 'data/abilities.js', 'data/items.js', 'data/equipment.js', 'data/story.js', 'data/quests.js'].map(imp));

// mappe fatte a mano (prima dei paesi da OpenStreetMap): il sorgente di maps.js fino ai paesi OSM
export const HAND_MAPS = (()=>{
  let src = readFileSync(WEB + 'data/maps.js', 'utf8');
  src = src.slice(0, src.indexOf('// via più vicina a una casella')).replace(/^import .*$/m, '').replace('export const MAPS', 'const MAPS') + '\nmodule.exports = MAPS;';
  const path = process.env.TEMP + '/menace-hand-maps.cjs';
  writeFileSync(path, src);
  const req = createRequire(import.meta.url);
  delete req.cache[path];
  return req(path);
})();

// ---------- set di caratteri: ASCII + glifi extra da 128 ----------
export const EXTRA = ['à', 'è', 'é', 'ì', 'ò', 'ù', 'À', 'È', 'É', 'Ì', 'Ò', 'Ù', '·', '…', '«', '»', '’', '→', '♥', '★', '_'];
export function code(ch){
  ch = ALIAS[ch] || ch;
  const e = EXTRA.indexOf(ch);
  if (e >= 0) return 128 + e;
  const c = ch.charCodeAt(0);
  return c >= 32 && c < 127 && GLYPHS[ch] ? c : 63;   // '?'
}
// stringa C con i byte del nostro set (ottale per i non ASCII)
export function cstr(s){
  if (s == null) return 'NULL';
  let out = '"';
  for (const ch of String(s)){
    const c = code(ch);
    if (c === 34) out += '\\"'; else if (c === 92) out += '\\\\'; else if (c < 127) out += String.fromCharCode(c); else out += '\\' + c.toString(8).padStart(3, '0');
  }
  return out + '"';
}
export function fontTables(){
  const W = new Array(256).fill(0), R = Array.from({ length:256 }, ()=>new Array(9).fill(0));
  const put = (c, gl)=>{ const rows = gl.split('|'); W[c] = rows[0].length; rows.forEach((r, y)=>{ let b = 0; [...r].forEach((p, x)=>{ if (p === '#') b |= 1 << x; }); R[c][y] = b; }); };
  for (const [ch, gl] of Object.entries(GLYPHS)){ const e = EXTRA.indexOf(ch); if (e >= 0) put(128 + e, gl); else if (ch.length === 1 && ch.charCodeAt(0) < 127) put(ch.charCodeAt(0), gl); }
  return `const u8 FONT_W[256] = { ${W.join(',')} };\nconst u16 FONT_ROWS[256][9] = {\n${R.map(r=>'  {' + r.join(',') + '}').join(',\n')}\n};\n`;
}

// ---------- indici: flag, mappe, personaggi, oggetti... ----------
export const ids = list=>Object.fromEntries(list.map((k, i)=>[k, i]));
const flagSet = new Set(['intro_done']);
const addFlags = c=>{ for (const f of [...(c?.has || []), ...(c?.not || [])]) flagSet.add(f); };
for (const e of Object.values(EVENTS)){ addFlags(e.if); for (const s of [...e.steps, ...(e.doneSteps || [])]) if (s.flag) flagSet.add(s.flag); }
for (const vs of Object.values(NPCS)) for (const v of vs) addFlags(v.if);
for (const m of Object.values(HAND_MAPS)) for (const t of m.triggers || []) if (t.hideFlag) flagSet.add(t.hideFlag);
for (const s of ['sigillo_alba', 'sigillo_meriggio', 'sigillo_vespro', 'sigillo_notte', 'game_done']) flagSet.add(s);
export const FLAGS = [...flagSet];
export const FLAG = ids(FLAGS);
export const MAP_IDS = Object.keys(HAND_MAPS);
export const MAP = ids(MAP_IDS);
export const CHAR_IDS = Object.keys(CHARACTERS);
export const CHAR = ids(CHAR_IDS);
export const AB_IDS = Object.keys(ABILITIES);
export const AB = ids(AB_IDS);
export const MON_IDS = Object.keys(MONSTERS);
export const MON = ids(MON_IDS);
export const ZONE_IDS = Object.keys(ZONES);
export const ZONE = ids(ZONE_IDS);
// oggetti: consumabili + equipaggiamento + tomi, esclusi i mezzi (sulla GBA non ci sono)
export const ITEM_IDS = [...Object.keys(ITEMS).filter(k=>!ITEMS[k].vehicle && k !== 'scarpe'), ...Object.keys(EQUIP), ...Object.keys(TOMES)];
export const ITEM = ids(ITEM_IDS);
export const QUEST_IDS = Object.keys(QUESTS);
export const QUEST = ids(QUEST_IDS);
export const NPC_IDS = Object.keys(NPCS);
export const NPC = ids(NPC_IDS);
export const EVENT_IDS = Object.keys(EVENTS);
export const EVENT = ids(EVENT_IDS);
export const ELEMENTS = ['neutro', 'fuoco', 'ghiaccio', 'tuono', 'vento', 'terra', 'acqua', 'sacro', 'oscurita'];
export const ELEM = ids(ELEMENTS);
export const flagList = arr=>`(const u8[]){${[...(arr || []).map(f=>FLAG[f]), 255].join(',')}}`;
export const cname = s=>s.toUpperCase().replace(/[^A-Z0-9]/g, '_');
