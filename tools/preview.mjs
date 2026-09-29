// anteprime: build/prev-tiles.png, build/prev-chars.png
import { Img, previewSheet } from './pixel.mjs';
import { TILES, rgbPal } from './tiles.mjs';
import { characterFrames, characterPalette } from './chars.mjs';
import { CHARACTERS } from '../../RPG/www/js/data/characters.js';

const items = [];
for (const [name, t] of Object.entries(TILES)){
  if (/^water\d+_1$/.test(name)) continue;
  const img = new Img(16, 16); t.draw(img, 3, 5);
  items.push({ img, pal:rgbPal(t.pal), opaque:true });
}
previewSheet('build/prev-tiles.png', items, 12, 4);
const ch = [];
for (const [id, c] of Object.entries(CHARACTERS)){
  const pal = characterPalette(c.look, c.color);
  for (const f of characterFrames(c.look)) ch.push({ img:f, pal });
}
previewSheet('build/prev-chars.png', ch, 9, 4);
console.log('ok', items.length, 'tile');
