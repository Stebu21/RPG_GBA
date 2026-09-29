// Dati di gioco in C dal gioco web: personaggi, abilità, mostri, oggetti, dialoghi, eventi, missioni.
import { CHARACTERS, MONSTERS, ZONES, ABILITIES, COMBOS, ITEMS, SHOPS, EQUIP, TOMES, NPCS, EVENTS, QUESTS, HAND_MAPS,
  FLAGS, FLAG, MAP, MAP_IDS, CHAR, CHAR_IDS, AB, AB_IDS, MON, MON_IDS, ZONE_IDS, ITEM, ITEM_IDS, QUEST_IDS, NPC_IDS, EVENT_IDS, EVENT,
  ELEMENTS, ELEM, cstr, flagList, cname } from './gen-common.mjs';
import { SHOP_IDS, LOOK_LIST } from './gen-maps.mjs';

const TYPE = { phys:0, mag:1, heal:2, healall:3, revive:4, buff:5, status:6, steal:7 };
const TARGET = { enemy:0, enemies:1, ally:2, allies:3, self:4 };
const STATUS = { veleno:1, sonno:2 };
const STAT = { atk:1, def:2, spd:3, mag:4 };
const lines = (arr, name)=>`static const Line ${name}[] = {\n${(arr.length ? arr : [['', '...']]).map(([w, t])=>`  { ${cstr(w || '')}, ${cstr(t)} }`).join(',\n')}\n};\n`;

export function genData(){
  let c = '';
  // --- abilità ---
  c += `const Ability ABILITIES[] = {\n${AB_IDS.map(k=>{ const a = ABILITIES[k];
    return `  { ${cstr(a.name)}, ${cstr(a.desc || '')}, ${a.mp || 0}, ${TYPE[a.type] ?? 0}, ${TARGET[a.target] ?? 0}, ${ELEM[a.element] ?? 0}, ${a.hits || 1}, ${Math.round((a.crit || 0) * 100)}, ${a.limit ? 1 : 0}, ${Math.min(255, a.power || 0)}, ${STATUS[a.status?.id] || 0}, ${Math.round((a.status?.chance || 0) * 100)}, ${STAT[a.buff?.stat] || 0}, ${Math.round((a.buff?.mult || 1) * 10)}, ${a.buff?.turns || 0} }`; }).join(',\n')}\n};\nconst u8 NUM_ABILITIES = ${AB_IDS.length};\n`;
  c += `const Combo COMBOS[] = {\n${Object.values(COMBOS).map(k=>`  { ${cstr(k.name)}, ${cstr(k.desc)}, ${k.mp.ste}, ${k.mp.riki}, ${k.power}, ${ELEM[k.element] ?? 0}, ${TARGET[k.target]}, ${k.hits || 1}, ${Math.round((k.crit || 0) * 100)}, ${k.lv} }`).join(',\n')}\n};\nconst u8 NUM_COMBOS = ${Object.keys(COMBOS).length};\n`;
  // --- personaggi ---
  const st = s=>`{${['hp', 'mp', 'atk', 'def', 'mag', 'spr', 'spd'].map(k=>Math.round(s[k])).join(',')}}`;
  const st10 = s=>`{${['hp', 'mp', 'atk', 'def', 'mag', 'spr', 'spd'].map(k=>Math.round(s[k] * 10)).join(',')}}`;
  for (const id of CHAR_IDS) c += `static const Learn LEARN_${cname(id)}[] = { ${CHARACTERS[id].learnset.filter(l=>l.ab in AB).map(l=>`{${l.lv},${AB[l.ab]}}`).join(',')} };\n`;
  c += `const CharDef CHARS[] = {\n${CHAR_IDS.map(id=>{ const ch = CHARACTERS[id];
    return `  { ${cstr(ch.name)}, ${cstr(ch.className)}, ${st(ch.base)}, ${st10(ch.growth)}, LEARN_${cname(id)}, ${ch.learnset.filter(l=>l.ab in AB).length}, ${CHAR[id]}, ${AB[ch.limit] ?? 255}, PORTRAIT_${cname(id)}, PORTRAIT_PAL_${cname(id)}, NULL, NULL }`; }).join(',\n')}\n};\nconst u8 NUM_CHARS = ${CHAR_IDS.length};\n`;
  // --- mostri ---
  for (const id of MON_IDS){ const m = MONSTERS[id];
    c += `static const Move MOVES_${cname(id)}[] = {\n${m.moves.map(mv=>`  { ${cstr(mv.name)}, ${TYPE[mv.type] ?? 0}, ${Math.min(255, mv.power || 0)}, ${ELEM[mv.element] ?? 0}, ${TARGET[mv.target] ?? 0}, ${mv.w || 1}, ${STATUS[mv.status?.id] || 0}, ${Math.round((mv.status?.chance || 0) * 100)} }`).join(',\n')}\n};\n`; }
  const emask = arr=>(arr || []).reduce((a, e)=>a | (1 << (ELEM[e] ?? 0)), 0);
  c += `const Monster MONSTERS[] = {\n${MON_IDS.map(id=>{ const m = MONSTERS[id];
    return `  { ${cstr(m.name)}, ${m.level}, ${m.hp}, ${m.atk}, ${m.def}, ${m.mag}, ${m.spr}, ${m.spd}, ${m.exp}, ${m.gold}, ${emask(m.weak)}, ${emask(m.resist)}, MOVES_${cname(id)}, ${m.moves.length}, ${id.startsWith('boss') ? 1 : 0}, MON_GFX_${cname(id)}, MON_PAL_${cname(id)} }`; }).join(',\n')}\n};\nconst u8 NUM_MONSTERS = ${MON_IDS.length};\n`;
  const BACK = { varese:0, vedano:1, castiglione:2, jerago:3, samarate:4, sacromonte:5 };
  c += ZONE_IDS.map(z=>`static const u8 ZMON_${cname(z)}[] = { ${ZONES[z].monsters.map(m=>MON[m]).join(',')} };\n`).join('');
  c += `const Zone ZONES[] = {\n${ZONE_IDS.map(z=>`  { ZMON_${cname(z)}, ${ZONES[z].monsters.length}, ${ZONES[z].min}, ${ZONES[z].max}, ${Math.round(ZONES[z].rate * 256)}, ${BACK[z] ?? 0} }`).join(',\n')}\n};\nconst u8 NUM_ZONES = ${ZONE_IDS.length};\n`;
  // --- oggetti ---
  const ITYPE = { heal:0, full:1, mp:2, revive:3, cure:4, quest:5, key:6 };
  const SLOT = { arma:0, abito:1, accessorio:2 };
  const who = w=>w ? w.reduce((a, id)=>a | (1 << CHAR[id]), 0) : 255;
  c += `const Item ITEMS[] = {\n${ITEM_IDS.map(id=>{
    if (ITEMS[id]){ const it = ITEMS[id]; return `  { ${cstr(it.name)}, ${cstr(it.desc)}, ${it.price || 0}, ${ITYPE[it.type] ?? 5}, ${it.type === 'revive' ? 50 : it.power || (it.status ? STATUS[it.status] : 0)}, 0, 255, 255, 0,0,0,0,0, 0,0 }`; }
    if (EQUIP[id]){ const e = EQUIP[id], s = e.stats; return `  { ${cstr(e.name)}, ${cstr(e.desc || '')}, ${e.price}, 7, 0, ${SLOT[e.slot]}, ${who(e.who)}, 255, ${s.atk || 0},${s.def || 0},${s.mag || 0},${s.spr || 0},${s.spd || 0}, ${s.hp || 0},${s.mp || 0} }`; }
    const t = TOMES[id]; return `  { ${cstr(t.name)}, ${cstr('Insegna ' + (ABILITIES[t.ab]?.name || '') + '.')}, ${t.price}, 8, 0, 0, ${who([t.who])}, ${AB[t.ab] ?? 255}, 0,0,0,0,0, 0,0 }`;
  }).join(',\n')}\n};\nconst u8 NUM_ITEMS = ${ITEM_IDS.length};\n`;
  c += SHOP_IDS.map(s=>{ const all = [...(SHOPS[s].oggetti || []), ...(SHOPS[s].armi || []), ...(SHOPS[s].abiti || []), ...(SHOPS[s].magie || [])].filter(i=>i in ITEM);
    return `static const u8 SHOP_${cname(s)}[] = { ${all.map(i=>ITEM[i]).join(',')} };\n`; }).join('');
  c += `const Shop SHOPS[] = { ${SHOP_IDS.map(s=>`{ SHOP_${cname(s)}, sizeof(SHOP_${cname(s)}) }`).join(', ')} };\n`;
  // --- NPC ---
  NPC_IDS.forEach((id, i)=>{ NPCS[id].forEach((v, j)=>{ c += lines(v.lines.map(l=>[v.name, l]), `NL_${i}_${j}`); }); });
  c += NPC_IDS.map((id, i)=>`static const NpcVariant NV_${i}[] = { ${NPCS[id].map((v, j)=>`{ ${flagList(v.if?.has)}, ${flagList(v.if?.not)}, NL_${i}_${j}, ${v.lines.length} }`).join(', ')} };\n`).join('');
  c += `const Npc NPCS[] = { ${NPC_IDS.map((id, i)=>`{ NV_${i}, ${NPCS[id].length} }`).join(', ')} };\n`;
  // --- eventi ---
  const OP = { d:0, flag:1, join:2, battle:3, item:4, heal:5, ending:6 };
  const steps = (arr, name)=>{
    let pre = '';
    const body = arr.map((s, k)=>{
      if (s.d){ pre += lines(s.d, `${name}_D${k}`); return `  { 0, 0, ${s.d.length}, ${name}_D${k} }`; }
      if (s.flag) return `  { 1, ${FLAG[s.flag]}, 0, NULL }`;
      if (s.join) return `  { 2, ${CHAR[s.join]}, 0, NULL }`;
      if (s.battle) return `  { 3, 1, ${MON[s.battle]}, NULL }`;
      if (s.item) return `  { 4, ${ITEM[s.item] ?? 0}, ${s.qty || 1}, NULL }`;
      if (s.heal) return `  { 5, 0, 0, NULL }`;
      if (s.ending) return `  { 6, 0, 0, NULL }`;
      return `  { 5, 0, 0, NULL }`;
    });
    return pre + `static const Step ${name}[] = {\n${body.join(',\n') || '  {5,0,0,NULL}'}\n};\n`;
  };
  EVENT_IDS.forEach((id, i)=>{ c += steps(EVENTS[id].steps, `ES_${i}`); c += steps(EVENTS[id].doneSteps || [], `ED_${i}`); });
  c += `const Event EVENTS[] = {\n${EVENT_IDS.map((id, i)=>{ const e = EVENTS[id];
    return `  { ${e.map ? MAP[e.map] : 255}, ${e.when === 'enter' ? 1 : 0}, ${flagList(e.if?.has)}, ${flagList(e.if?.not)}, ES_${i}, ${e.steps.length}, ED_${i}, ${(e.doneSteps || []).length} }`; }).join(',\n')}\n};\nconst u8 NUM_EVENTS = ${EVENT_IDS.length};\n`;
  // --- missioni ---
  QUEST_IDS.forEach((id, i)=>{ const q = QUESTS[id]; for (const k of ['offer', 'accepted', 'progress', 'complete', 'after']) c += lines(q[k] || [], `QL_${i}_${k}`); });
  c += `const Quest QUESTS[] = {\n${QUEST_IDS.map((id, i)=>{ const q = QUESTS[id];
    return `  { ${cstr(q.name)}, ${cstr(q.desc)}, ${q.kind === 'item' ? 1 : 0}, ${q.kind === 'item' ? ITEM[q.item] ?? 0 : MON[q.target] ?? 0}, ${q.need}, ${q.reward.gold || 0}, ${q.reward.item ? ITEM[q.reward.item] ?? 255 : 255}, ${q.reward.qty || 1}, QL_${i}_offer, QL_${i}_accepted, QL_${i}_progress, QL_${i}_complete, QL_${i}_after, ${['offer', 'accepted', 'progress', 'complete', 'after'].map(k=>(q[k] || []).length || 1).join(', ')} }`; }).join(',\n')}\n};\nconst u8 NUM_QUESTS = ${QUEST_IDS.length};\n`;
  c += `const u8 NUM_FLAGS = ${FLAGS.length};\n`;
  c += `const char *const ELEMENT_NAMES[] = { ${ELEMENTS.map(cstr).join(', ')} };\n`;
  // --- obiettivo principale: la tappa successiva della trama ---
  const where = (map, pred)=>{ const t = HAND_MAPS[map].triggers.find(pred); return t ? [t.x, t.y] : [0, 0]; };
  const GOALS = [
    ['intro_done', 'accademia', t=>t.npc === 'rettore_cid', 'Rettore Cid'],
    ['sigillo_alba', 'vedano', t=>t.event === 'lazzaretto', 'Chiesa del Lazzaretto'],
    ['sigillo_meriggio', 'castiglione', t=>t.event === 'collegiata', 'Collegiata'],
    ['sigillo_vespro', 'jerago', t=>t.event === 'castello', 'Castello di Jerago'],
    ['sigillo_notte', 'samarate', t=>t.event === 'officina', 'Officine di Samarate'],
    ['game_done', 'sacromonte', t=>t.event === 'finale', 'Santuario: Eterna'],
  ];
  c += `const Goal GOALS[] = {\n${GOALS.map(([f, m, p, l])=>{ const [x, y] = where(m, p); return `  { ${FLAG[f]}, ${MAP[m]}, ${x}, ${y}, ${cstr(l)} }`; }).join(',\n')}\n};\nconst u8 NUM_GOALS = ${GOALS.length};\n`;
  return c;
}

// indici simbolici per il codice C
export function genIds(){
  let h = '#pragma once\n';
  const en = (prefix, list)=>list.map((k, i)=>`#define ${prefix}_${cname(k)} ${i}`).join('\n') + '\n';
  h += en('FLAG', FLAGS) + en('MAP', MAP_IDS) + en('CH', CHAR_IDS) + en('AB', AB_IDS) + en('MON', MON_IDS) + en('IT', ITEM_IDS) + en('EV', EVENT_IDS) + en('QU', QUEST_IDS) + en('EL', ELEMENTS);
  h += `#define NUM_LOOKS_HERO ${CHAR_IDS.length}\n`;
  return h;
}
