// anteprima dei personaggi: build/prev-chars.png (eroi e alcuni NPC, 9 fotogrammi ciascuno)
import { previewSheet } from './pixel.mjs';
import { characterFrames, characterPalette } from './chars.mjs';
import { genMaps, LOOK_LIST } from './gen-maps.mjs';

genMaps();
const ch = [];
for (const l of LOOK_LIST.slice(0, 14)){
  const pal = characterPalette(l.look, l.color);
  for (const f of characterFrames(l.look)) ch.push({ img:f, pal, bg:[120, 200, 110] });
}
previewSheet('build/prev-chars.png', ch, 9, 4, [128, 200, 112]);
console.log('ok');
