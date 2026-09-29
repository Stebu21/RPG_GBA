// Mappe consultabili (menu START > Mappa), come in Pokémon:
//  - vista 0: la provincia, ricavata dalla mappa del mondo (4 pixel per casella), con strade e paesi;
//  - viste 1..: la pianta di ogni paese, cioè il paese disegnato davvero, rimpicciolito, con i luoghi utili.
// Per ogni mappa: in quale vista si vede e dove (VIEW_POS), e dove sta sulla provincia (WORLD_POS).
import { cArray, hash2 } from './pixel.mjs';
import { convertLayers, quantizeTiles } from './gba-convert.mjs';
import { paintMap } from './overworld.mjs';
import { HAND_MAPS, MAP_IDS, MAP, cstr } from './gen-common.mjs';

const H = s=>parseInt(s.slice(1), 16);
const K = {
  frame:H('#5a3a22'), frameL:H('#8a5c34'), frameD:H('#382010'),
  grass:H('#88c860'), grassD:H('#6aac4c'), grassL:H('#a8dc78'),
  tree:H('#2e7a3c'), treeL:H('#4a9a48'), treeD:H('#1c4c28'),
  mount:H('#b08a5c'), mountL:H('#d8b888'), mountD:H('#7a5a38'), snow:H('#f4f0e8'),
  water:H('#4c90e0'), waterL:H('#8cc4f4'),
  road:H('#f8e4a8'), roadD:H('#b89058'),
  town:H('#e04838'), townL:H('#ff9080'), townD:H('#802018'), wall:H('#fff4dc'),
  shrine:H('#f8f8f8'), gold:H('#f8d048'), ol:H('#302028'),
};
const TOWN_IDS = MAP_IDS.filter(id=>HAND_MAPS[id].town && !HAND_MAPS[id].indoor && id !== 'accademia');
const EVENT_NAMES = { lazzaretto:'Chiesa del Lazzaretto', collegiata:'Collegiata', castello:'Castello di Jerago', officina:'Officine' };
const poiName = to=>/^negozio/.test(to) ? 'Negozio' : /^locanda/.test(to) ? 'Locanda' : /^chiesa/.test(to) ? 'Chiesa' : to === 'accademia' ? 'Accademia del Sacro Monte' : to === 'world' ? 'Uscita verso la provincia' : null;

// cornice di legno attorno a un rettangolo utile
function framed(img, x0, y0, w, h){
  for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++){
    if (x >= x0 && x < x0 + w && y >= y0 && y < y0 + h) continue;
    const edge = (x === x0 - 1 || x === x0 + w) && y >= y0 - 1 && y <= y0 + h || (y === y0 - 1 || y === y0 + h) && x >= x0 - 1 && x <= x0 + w;
    img[y * 240 + x] = edge ? K.frameD : (x + (y >> 3)) % 5 === 0 ? K.frameL : K.frame;
  }
}
function toView(img, name, exact){
  const src = exact ? img : quantizeTiles(img, 240, 160, 7);
  const r = convertLayers([{ f0:src, f1:null }], 240, 160, { name, maxPals:7, maxTiles:1000 });
  const map = [];
  for (let ty = 0; ty < 20; ty++) for (let tx = 0; tx < 32; tx++) map.push(tx < 30 ? (r.maps[0][ty * 30 + tx] & 0x0FFF) | ((((r.maps[0][ty * 30 + tx] >> 12) || 1) + 7) << 12) : 0);
  return { tiles:r.tiles, ntiles:r.ntiles, pals:r.pals, map };
}

// ---------- la provincia ----------
function provinceView(){
  const W = HAND_MAPS.world, rows = W.tiles, MW = Math.max(...rows.map(r=>r.length)), MH = rows.length, X0 = 8;
  const at = (x, y)=>(rows[y] || '')[x] || '^';
  const img = new Int32Array(240 * 160);
  const set = (x, y, c)=>{ if (x >= 0 && y >= 0 && x < 240 && y < 160) img[y * 240 + x] = c; };
  framed(img, X0, 0, MW * 4, 160);
  for (let cy = 0; cy < MH; cy++) for (let cx = 0; cx < MW; cx++){
    const c = at(cx, cy), X = X0 + cx * 4, Y = cy * 4;
    const road = (x, y)=>'=B123456789S'.includes(at(x, y));
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++){
      let col = (i + j + cx + cy) % 7 === 0 ? K.grassD : (hash2(X + i, Y + j) < 0.08 ? K.grassL : K.grass);
      if (c === '^'){ col = at(cx, cy + 1) !== '^' && j >= 2 ? K.mountD : (i + j) % 3 === 0 ? K.mountL : K.mount; if (cy < 3 && (i + j + cx) % 4 === 0) col = K.snow; }
      else if (c === '~') col = (i + j * 2 + cx) % 5 === 0 ? K.waterL : K.water;
      else if (c === 'B') col = i % 2 ? K.frameL : K.frame;
      // strade: una striscia chiara con il bordo scuro che segue i collegamenti tra i paesi
      if (road(cx, cy) && c !== 'B'){
        const n = road(cx, cy - 1), s = road(cx, cy + 1), w = road(cx - 1, cy), e = road(cx + 1, cy);
        const onV = i >= 1 && i <= 2 && ((j <= 2 && n) || (j >= 1 && s) || (j >= 1 && j <= 2)), onH = j >= 1 && j <= 2 && ((i <= 2 && w) || (i >= 1 && e) || (i >= 1 && i <= 2));
        if (onV || onH) col = K.road;
        else if ((i === 0 || i === 3) && (j >= 1 && j <= 2) && !((i === 0 && w) || (i === 3 && e))) col = K.roadD;
      }
      set(X + i, Y + j, col);
    }
    if (c === 'T') for (const [i, j, k] of [[1, 0, K.treeL], [2, 0, K.tree], [0, 1, K.treeL], [1, 1, K.tree], [2, 1, K.tree], [3, 1, K.treeD], [1, 2, K.tree], [2, 2, K.treeD], [1, 3, K.frameD]]) set(X + i, Y + j, k);
  }
  const pins = [];
  for (const t of W.triggers || []){
    if (t.type !== 'portal' || !(t.to.map in MAP)) continue;
    pins.push({ x:X0 + t.x * 4 + 2, y:t.y * 4 + 2, name:HAND_MAPS[t.to.map].name, map:t.to.map, cx:t.x, cy:t.y });
    const X = X0 + t.x * 4 + 2, Y = t.y * 4 + 2;
    if (t.to.map === 'sacromonte'){
      for (let j = -4; j <= 3; j++) for (let i = -4; i <= 3; i++) set(X + i, Y + j, i === -4 || i === 3 || j === -4 || j === 3 ? K.ol : (i + j) % 2 ? K.shrine : K.wall);
      for (let j = -8; j < -4; j++) set(X, Y + j, K.gold); set(X - 1, Y - 7, K.gold); set(X + 1, Y - 7, K.gold);
    } else for (let j = -5; j <= 4; j++) for (let i = -5; i <= 4; i++){
      const out = i === -5 || i === 4 || j === -5 || j === 4;
      set(X + i, Y + j, out ? K.ol : j < -1 ? (j === -4 ? K.townL : i > 1 ? K.townD : K.town) : (i === -1 || i === 0) && j > 0 ? K.frameD : K.wall);
    }
  }
  return { v:toView(img, 'mappa della provincia', true), ox:X0, oy:0, scale:4, pins };
}

// ---------- la pianta di un paese: il disegno vero, ridotto col colore prevalente ----------
function townView(id){
  const m = HAND_MAPS[id], Hc = m.tiles.length, Wc = Math.max(...m.tiles.map(r=>r.length));
  const portals = Object.fromEntries((m.triggers || []).filter(t=>t.type === 'portal').map(t=>[t.x + ',' + t.y, t.to.map]));
  const r = paintMap(id, m, 0, { portals }), PW = Wc * 16;
  const s = Math.min(Math.floor(224 / Wc), Math.floor(144 / Hc)), w = Wc * s, h = Hc * s;
  const ox = Math.round((240 - w) / 2), oy = Math.round((160 - h) / 2) + 2;
  const img = new Int32Array(240 * 160);
  framed(img, ox, oy, w, h);
  for (let v = 0; v < h; v++) for (let u = 0; u < w; u++){
    const x0 = Math.floor(u * 16 / s), x1 = Math.max(x0 + 1, Math.floor((u + 1) * 16 / s)), y0 = Math.floor(v * 16 / s), y1 = Math.max(y0 + 1, Math.floor((v + 1) * 16 / s));
    const cnt = new Map(); let best = 0, bn = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++){ const i = y * PW + x, c = r.top[i] >= 0 ? r.top[i] : r.ground[i]; const n = (cnt.get(c) || 0) + 1; cnt.set(c, n); if (n > bn){ bn = n; best = c; } }
    img[(oy + v) * 240 + ox + u] = best;
  }
  // i luoghi utili: negozio, locanda, chiesa, uscite, i posti della trama (porte doppie contate una volta)
  const pins = [];
  for (const t of m.triggers || []){
    const name = t.type === 'portal' ? poiName(t.to.map) : t.type === 'door_event' ? EVENT_NAMES[t.event] : null;
    if (!name || pins.some(p=>p.name === name && Math.abs(p.cx - t.x) <= 1 && p.cy === t.y)) continue;
    pins.push({ x:ox + t.x * s + (s >> 1), y:oy + t.y * s + (s >> 1), name, cx:t.x, cy:t.y });
  }
  return { v:toView(img, 'pianta di ' + id), ox, oy, scale:s, pins };
}

export function genTownMap(){
  const views = [{ id:'world', ...provinceView() }, ...TOWN_IDS.map(id=>({ id, ...townView(id) }))];
  // posizioni: ogni mappa eredita dai portali la casella del mondo e, se sta in un paese, il punto nella pianta
  const wpos = {}, vpos = {};
  for (const p of views[0].pins) if (!wpos[p.map]){ wpos[p.map] = [p.cx, p.cy]; }
  for (const [vi, v] of views.entries()) if (vi) vpos[v.id] = [vi, -1, -1];
  const q = Object.keys(wpos);
  while (q.length){
    const id = q.shift();
    for (const t of HAND_MAPS[id].triggers || []){
      if (t.type !== 'portal' || !(t.to.map in MAP) || t.to.map === 'world') continue;
      if (!wpos[t.to.map]){ wpos[t.to.map] = wpos[id]; q.push(t.to.map); }
      // un interno si vede nella pianta del paese, sulla casella dove si esce
      if (!vpos[t.to.map] && vpos[id] && vpos[id][1] < 0) vpos[t.to.map] = [vpos[id][0], t.x, t.y];
    }
  }
  // l'uscita di un interno: il portale che lo riporta nel paese
  for (const id of MAP_IDS){
    const back = (HAND_MAPS[id].triggers || []).find(t=>t.type === 'portal' && vpos[t.to.map] && vpos[t.to.map][1] < 0 && HAND_MAPS[t.to.map].town && !HAND_MAPS[t.to.map].indoor);
    if (back && HAND_MAPS[id].indoor || back && id === 'accademia') vpos[id] = [vpos[back.to.map][0], back.to.x, back.to.y];
  }
  let c = '';
  views.forEach((v, i)=>{
    c += cArray('u16', `VIEW_TILES_${i}`, v.v.tiles, 16) + cArray('u16', `VIEW_MAP_${i}`, v.v.map);
    c += cArray('u16', `VIEW_PAL_${i}`, v.v.pals.flatMap(p=>{ const o = [...p]; while (o.length < 16) o.push(0); return o; }));
    c += `static const MapPin VIEW_PINS_${i}[] = {\n${v.pins.map(p=>`  { ${p.x}, ${p.y}, ${cstr(p.name)} }`).join(',\n')}\n};\n`;
  });
  c += `const MapView VIEWS[] = {\n${views.map((v, i)=>`  { ${cstr(i ? HAND_MAPS[v.id].name : 'Provincia di Varese')}, VIEW_TILES_${i}, ${v.v.ntiles}, VIEW_MAP_${i}, VIEW_PAL_${i}, ${v.v.pals.length}, ${v.ox}, ${v.oy}, ${v.scale}, VIEW_PINS_${i}, ${v.pins.length} }`).join(',\n')}\n};\nconst u8 NUM_VIEWS = ${views.length};\n`;
  c += `const u8 WORLD_POS[][2] = {\n${MAP_IDS.map(id=>`  { ${(wpos[id] || [255, 255]).join(', ')} }`).join(',\n')}\n};\n`;
  c += `const u8 VIEW_POS[][3] = {\n${MAP_IDS.map(id=>`  { ${(vpos[id] || [0, 255, 255]).map(n=>n < 0 ? 255 : n).join(', ')} }`).join(',\n')}\n};\n`;
  console.log('mappe consultabili:', views.map(v=>`${v.id} ${v.v.ntiles}t/${v.v.pals.length}p/${v.pins.length}luoghi`).join(', '));
  return c;
}
