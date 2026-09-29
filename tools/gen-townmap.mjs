// Mappa consultabile della provincia (menu START > Mappa): immagine 240x160 ricavata dalla mappa del
// mondo (4 pixel per casella), posizione di ogni luogo sulla mappa del mondo, elenco dei paesi.
import { cArray, hash2 } from './pixel.mjs';
import { convertLayers } from './gba-convert.mjs';
import { HAND_MAPS, MAP_IDS, MAP, cstr } from './gen-common.mjs';

const H = s=>parseInt(s.slice(1), 16);
const K = {
  frame:H('#5a3a22'), frameL:H('#8a5c34'), frameD:H('#382010'),
  grass:H('#88c860'), grassD:H('#6aac4c'), grassL:H('#a8dc78'),
  tree:H('#2e7a3c'), treeL:H('#4a9a48'), treeD:H('#1c4c28'),
  mount:H('#b08a5c'), mountL:H('#d8b888'), mountD:H('#7a5a38'), snow:H('#f4f0e8'),
  water:H('#4c90e0'), waterL:H('#8cc4f4'), waterD:H('#2c60b0'),
  road:H('#f0dca0'), roadD:H('#c8a868'),
  town:H('#e04838'), townL:H('#ff9080'), townD:H('#802018'), wall:H('#fff4dc'),
  shrine:H('#f8f8f8'), gold:H('#f8d048'), ol:H('#302028'),
};
export const TM_X0 = 8;                 // la mappa del mondo (56x40 caselle) occupa x 8..231

export function genTownMap(){
  const W = HAND_MAPS.world, rows = W.tiles, MW = Math.max(...rows.map(r=>r.length)), MH = rows.length;
  const at = (x, y)=>(rows[y] || '')[x] || '^';
  const img = new Int32Array(240 * 160);
  const set = (x, y, c)=>{ if (x >= 0 && y >= 0 && x < 240 && y < 160) img[y * 240 + x] = c; };
  // cornice di legno ai lati
  for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++){
    if (x >= TM_X0 && x < TM_X0 + MW * 4) continue;
    const e = x === TM_X0 - 1 || x === TM_X0 + MW * 4 ? K.frameD : (x + (y >> 3)) % 5 === 0 ? K.frameL : K.frame;
    set(x, y, e);
  }
  for (let cy = 0; cy < MH; cy++) for (let cx = 0; cx < MW; cx++){
    const c = at(cx, cy), X = TM_X0 + cx * 4, Y = cy * 4;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++){
      let col = (i + j + cx + cy) % 7 === 0 ? K.grassD : (hash2(X + i, Y + j) < 0.08 ? K.grassL : K.grass);
      if (c === '^'){
        // montagne: sfumate verso il bordo, cime innevate nel nord
        const edge = at(cx, cy + 1) !== '^' && j >= 2;
        col = edge ? K.mountD : (i + j) % 3 === 0 ? K.mountL : K.mount;
        if (cy < 3 && (i + j + cx) % 4 === 0) col = K.snow;
      } else if (c === '~') col = (i + j * 2 + cx) % 5 === 0 ? K.waterL : K.water;
      else if (c === '=') col = j === 3 || i === 3 ? K.roadD : K.road;
      else if (c === 'B') col = i % 2 ? K.frameL : K.frame;
      set(X + i, Y + j, col);
    }
    if (c === 'T'){ for (const [i, j, k] of [[1, 0, K.treeL], [2, 0, K.tree], [0, 1, K.treeL], [1, 1, K.tree], [2, 1, K.tree], [3, 1, K.treeD], [1, 2, K.tree], [2, 2, K.treeD], [1, 3, K.frameD]]) set(X + i, Y + j, k); }
  }
  // i paesi: casette rosse con il muro chiaro, il santuario bianco con la croce dorata
  const towns = [];
  for (const t of W.triggers || []){
    if (t.type !== 'portal' || !(t.to.map in MAP)) continue;
    towns.push({ map:t.to.map, x:t.x, y:t.y, name:HAND_MAPS[t.to.map].name });
    const X = TM_X0 + t.x * 4 + 2, Y = t.y * 4 + 2;
    if (t.to.map === 'sacromonte'){
      for (let j = -4; j <= 3; j++) for (let i = -4; i <= 3; i++) set(X + i, Y + j, i === -4 || i === 3 || j === -4 || j === 3 ? K.ol : j < -1 ? K.shrine : (i + j) % 2 ? K.shrine : K.wall);
      for (let j = -8; j < -4; j++) set(X, Y + j, K.gold); set(X - 1, Y - 7, K.gold); set(X + 1, Y - 7, K.gold);
    } else {
      for (let j = -5; j <= 4; j++) for (let i = -5; i <= 4; i++){
        const out = i === -5 || i === 4 || j === -5 || j === 4;
        set(X + i, Y + j, out ? K.ol : j < -1 ? (j === -4 ? K.townL : i > 1 ? K.townD : K.town) : (i === -1 || i === 0) && j > 0 ? K.frameD : K.wall);
      }
    }
  }
  const r = convertLayers([{ f0:img, f1:null }], 240, 160, { name:'mappa consultabile', maxPals:7, maxTiles:900 });
  const map = [];
  for (let ty = 0; ty < 20; ty++) for (let tx = 0; tx < 32; tx++) map.push(tx < 30 ? (r.maps[0][ty * 30 + tx] & 0x0FFF) | ((((r.maps[0][ty * 30 + tx] >> 12) || 1) + 7) << 12) : 0);
  // posizione di ogni luogo sul mondo: si eredita lungo i portali partendo da quelli della mappa del mondo
  const pos = {}; const q = [];
  for (const t of towns){ if (!pos[t.map]){ pos[t.map] = [t.x, t.y]; q.push(t.map); } }
  while (q.length){
    const id = q.shift();
    for (const t of HAND_MAPS[id].triggers || []) if (t.type === 'portal' && t.to.map in MAP && t.to.map !== 'world' && !pos[t.to.map]){ pos[t.to.map] = pos[id]; q.push(t.to.map); }
  }
  let c = cArray('u16', 'TOWNMAP_TILES', r.tiles, 16) + `const u16 TOWNMAP_NTILES = ${r.ntiles};\nconst u8 TOWNMAP_NPAL = ${r.pals.length};\n` + cArray('u16', 'TOWNMAP_MAP', map);
  c += cArray('u16', 'TOWNMAP_PAL', r.pals.flatMap(p=>{ const o = [...p]; while (o.length < 16) o.push(0); return o; }));
  c += `const u8 WORLD_POS[][2] = {\n${MAP_IDS.map(id=>`  { ${(pos[id] || [255, 255]).join(', ')} }`).join(',\n')}\n};\n`;
  c += `const TownPin TOWNS[] = {\n${towns.map(t=>`  { ${MAP[t.map]}, ${t.x}, ${t.y}, ${cstr(t.name)} }`).join(',\n')}\n};\nconst u8 NUM_TOWNS = ${towns.length};\n`;
  console.log('mappa consultabile:', r.ntiles, 'tile,', r.pals.length, 'tavolozze,', towns.length, 'luoghi');
  return c;
}
