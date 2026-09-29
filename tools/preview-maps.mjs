// anteprima delle mappe disegnate (prima della conversione GBA): build/map-<id>.png
// uso: node tools/preview-maps.mjs id [cx cy]   (con cx cy: solo uno schermo 240x160 da quella casella, x3)
import { writePNG } from './pixel.mjs';
import { paintMap } from './overworld.mjs';
import { HAND_MAPS, MAP_IDS } from './gen-common.mjs';

const [argId, cx, cy] = process.argv.slice(2);
for (const id of argId ? [argId] : MAP_IDS){
  const m = HAND_MAPS[id];
  const portals = Object.fromEntries((m.triggers || []).filter(t=>t.type === 'portal').map(t=>[t.x + ',' + t.y, t.to.map]));
  const r = paintMap(id, m, 0, { portals });
  const MW = r.W * 16, MH = r.H * 16;
  const crop = cx != null, ox = crop ? +cx * 16 : 0, oy = crop ? +cy * 16 : 0, W = crop ? 240 : MW, H = crop ? 160 : MH;
  const rgba = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    const X = x + ox, Y = y + oy, i = Y * MW + X, inb = X < MW && Y < MH;
    const c = !inb ? 0 : r.top[i] >= 0 ? r.top[i] : r.ground[i] >= 0 ? r.ground[i] : 0xff00ff;
    const d = (y * W + x) * 4; rgba[d] = c >> 16; rgba[d + 1] = (c >> 8) & 255; rgba[d + 2] = c & 255; rgba[d + 3] = 255;
  }
  writePNG(`build/map-${id}${crop ? '-crop' : ''}.png`, W, H, rgba, crop ? 3 : 2);
}
console.log('ok');
