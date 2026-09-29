// Genera gen/assets.c, gen/ids.h e le anteprime in build/ dai dati e dal disegno del gioco web.
// uso: node tools/gen-assets.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { fontTables } from './gen-common.mjs';
import { genMaps, genLooks } from './gen-maps.mjs';
import { genData, genIds } from './gen-data.mjs';
import { genSprites } from './gen-sprites.mjs';
import { genUI, genBackdrops } from './gen-ui.mjs';
import { genAudio } from './gen-audio.mjs';
import { genTownMap } from './gen-townmap.mjs';
import { genMounts } from './mounts.mjs';
import { previewSheet, writePNG } from './pixel.mjs';

mkdirSync('gen', { recursive:true }); mkdirSync('build', { recursive:true });
const t0 = Date.now();
const maps = genMaps();                 // registra anche gli aspetti degli NPC
const sprites = await genSprites();
const parts = [
  '// Generato da tools/gen-assets.mjs: non modificare a mano.\n#include "data.h"\n#include <stddef.h>\n',
  fontTables(), maps, genLooks(), sprites.c, genData(), genUI(), genBackdrops(), genAudio(), genTownMap(), genMounts(),
];
writeFileSync('gen/assets.c', parts.join('\n'));
writeFileSync('gen/ids.h', genIds());
previewSheet('build/prev-sprites.png', sprites.preview.filter(p=>!p.title), 8, 3);
const title = sprites.preview.find(p=>p.title);
if (title){ const rgba = new Uint8Array(240 * 160 * 4); title.rgb.forEach((c, i)=>{ rgba[i * 4] = c >> 16; rgba[i * 4 + 1] = (c >> 8) & 255; rgba[i * 4 + 2] = c & 255; rgba[i * 4 + 3] = 255; }); writePNG('build/prev-title.png', 240, 160, rgba, 3); }
console.log(`gen/assets.c scritto in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
