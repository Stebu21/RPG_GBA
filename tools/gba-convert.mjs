// Da immagine a grafica GBA: tile 8x8 a 4 bit, tavolozze da 15 colori assegnate per tile,
// tile uguali (anche specchiati) salvati una volta sola, secondo fotogramma per i tile animati.
// Livelli: array di { f0:Int32Array, f1:Int32Array|null } in 0xRRGGBB (-1 = trasparente), stesse dimensioni.
const q15 = c=>((c >> 19) & 31) | (((c >> 11) & 31) << 5) | (((c >> 3) & 31) << 10);
const dist15 = (a, b)=>{ const d = i=>((a >> i) & 31) - ((b >> i) & 31); return d(0) ** 2 * 3 + d(5) ** 2 * 4 + d(10) ** 2 * 2; };

export function convertLayers(layers, W, H, { maxPals=15, maxTiles=1024, name='' }={}){
  const TW = W / 8, TH = H / 8;
  // 1. raccolta dei tile con i loro colori
  const cells = [];                 // per livello: array di { px0, px1, set } o null (vuoto)
  for (const L of layers){
    const arr = [];
    for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++){
      const px0 = new Int32Array(64), px1 = new Int32Array(64); let any = false, anim = false;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++){
        const i = (ty * 8 + y) * W + tx * 8 + x;
        const a = L.f0[i] < 0 ? -1 : q15(L.f0[i]), b = L.f1 ? (L.f1[i] < 0 ? -1 : q15(L.f1[i])) : a;
        px0[y * 8 + x] = a; px1[y * 8 + x] = b; if (a >= 0 || b >= 0) any = true; if (a !== b) anim = true;
      }
      if (!any){ arr.push(null); continue; }
      let set = new Set([...px0, ...px1].filter(c=>c >= 0));
      if (set.size > 15){
        // troppi colori nel tile: si fondono i più vicini (succede di rado, sui bordi tra materiali)
        const cols = [...set], remap = new Map();
        while (cols.length > 15){
          let best = [0, 1, 1e9];
          for (let i = 0; i < cols.length; i++) for (let j = i + 1; j < cols.length; j++){ const d = dist15(cols[i], cols[j]); if (d < best[2]) best = [i, j, d]; }
          remap.set(cols[best[1]], cols[best[0]]); cols.splice(best[1], 1);
        }
        const res = c=>{ while (remap.has(c)) c = remap.get(c); return c; };
        for (let k = 0; k < 64; k++){ if (px0[k] >= 0) px0[k] = res(px0[k]); if (px1[k] >= 0) px1[k] = res(px1[k]); }
        set = new Set(cols);
      }
      arr.push({ px0, px1, set, anim });
    }
    cells.push(arr);
  }
  // 2. tavolozze: insiemi di colori impacchettati (prima i più grandi, dove si aggiunge meno)
  const uniq = new Map();
  for (const arr of cells) for (const t of arr) if (t){ const k = [...t.set].sort((a, b)=>a - b).join(','); t.key = k; if (!uniq.has(k)) uniq.set(k, t.set); }
  // fusione agglomerativa: si uniscono di volta in volta i due gruppi con l'unione più piccola
  let pals = [...uniq.values()].map(x=>new Set(x));
  pals = pals.filter((p, i)=>!pals.some((o, j)=>j !== i && o.size >= p.size && (o.size > p.size || j < i) && [...p].every(c=>o.has(c))));
  for (;;){
    let bi = -1, bj = -1, bc = 1e9;
    for (let i = 0; i < pals.length; i++) for (let j = i + 1; j < pals.length; j++){
      let u = pals[i].size; for (const c of pals[j]) if (!pals[i].has(c)) u++;
      if (u > 15) continue;
      // costo: colori aggiunti al gruppo più grande, poi preferenza per unioni piccole
      const cost = (u - Math.max(pals[i].size, pals[j].size)) * 100 + u;
      if (cost < bc){ bi = i; bj = j; bc = cost; }
    }
    if (bi < 0) break;
    for (const c of pals[bj]) pals[bi].add(c); pals.splice(bj, 1);
  }
  // ricerca locale: si prova a svuotare una tavolozza spostando i suoi insiemi nelle altre
  const allSets = [...uniq.values()];
  const fits = (p, st)=>{ let u = p.size; for (const c of st) if (!p.has(c)) u++; return u <= 15; };
  for (let changed = true; changed;){
    changed = false;
    for (let pi = pals.length - 1; pi >= 0 && pals.length > 1; pi--){
      const trial = pals.filter((_, i)=>i !== pi).map(p=>new Set(p));
      const mine = allSets.filter(st=>!trial.some(p=>[...st].every(c=>p.has(c))));
      let ok = true;
      for (const st of mine.sort((a, b)=>b.size - a.size)){
        let best = -1, add = 99;
        trial.forEach((p, i)=>{ if (fits(p, st)){ let a = 0; for (const c of st) if (!p.has(c)) a++; if (a < add){ add = a; best = i; } } });
        if (best < 0){ ok = false; break; }
        for (const c of st) trial[best].add(c);
      }
      if (ok){ pals = trial; changed = true; }
    }
  }
  if (pals.length > maxPals) throw new Error(`${name}: servono ${pals.length} tavolozze (max ${maxPals})`);
  const palOf = new Map();
  for (const [k, s] of uniq){ for (let p = 0; p < pals.length; p++){ let ok = true; for (const c of s) if (!pals[p].has(c)){ ok = false; break; } if (ok){ palOf.set(k, p); break; } } }
  const palArr = pals.map(s=>[0, ...[...s].sort((a, b)=>a - b)]);
  const idxOf = palArr.map(pa=>new Map(pa.map((c, i)=>[c, i])));
  // 3. tile a indici, senza doppioni (anche specchiati); il tile 0 è vuoto
  const tiles = [new Uint8Array(64)], animTiles = [], tileKey = new Map([['0'.repeat(64), 0]]);
  const flip = (a, hf, vf)=>{ const o = new Uint8Array(64); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) o[y * 8 + x] = a[(vf ? 7 - y : y) * 8 + (hf ? 7 - x : x)]; return o; };
  const hex = a=>Buffer.from(a).toString('hex');
  const maps = [], anim = [];
  for (const arr of cells){
    const map = new Uint16Array(TW * TH);
    arr.forEach((t, i)=>{
      if (!t) return;
      const p = palOf.get(t.key), ix = idxOf[p];
      const a = Uint8Array.from(t.px0, c=>c < 0 ? 0 : ix.get(c)), b = Uint8Array.from(t.px1, c=>c < 0 ? 0 : ix.get(c));
      let found = -1, fl = 0;
      for (let f = 0; f < 4 && found < 0; f++){
        const k = hex(flip(a, f & 1, f & 2)) + (t.anim ? '|' + hex(flip(b, f & 1, f & 2)) : '');
        if (tileKey.has(k)){ found = tileKey.get(k); fl = f; }
      }
      if (found < 0){
        found = tiles.length; tiles.push(a); tileKey.set(hex(a) + (t.anim ? '|' + hex(b) : ''), found);
        if (t.anim){ animTiles.push(b); anim.push(found); }
      }
      map[i] = found | ((fl & 1) << 10) | ((fl & 2) << 10) | ((p + 1) << 12);
    });
    maps.push(map);
  }
  if (tiles.length > maxTiles) throw new Error(`${name}: ${tiles.length} tile (max ${maxTiles})`);
  // i secondi fotogrammi in coda: coppie (tile in VRAM, tile sorgente)
  const animPairs = []; anim.forEach((dst, k)=>animPairs.push(dst, tiles.length + k));
  const all = [...tiles, ...animTiles];
  const data = [];
  for (const t of all) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x += 4) data.push(t[y * 8 + x] | (t[y * 8 + x + 1] << 4) | (t[y * 8 + x + 2] << 8) | (t[y * 8 + x + 3] << 12));
  return { tiles:data, ntiles:tiles.length, maps, pals:palArr, anim:animPairs };
}

// Immagini sfumate (titolo): i tile si raggruppano in K famiglie (k-means sui colori), ogni famiglia
// riceve 15 colori (median cut) e ogni tile usa la tavolozza che lo rende meglio. Restituisce
// un'immagine 0xRRGGBB già riducibile esattamente da convertLayers.
export function quantizeTiles(rgb, W, H, K=7){
  const TW = W / 8, TH = H / 8, tiles = [];
  for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++){
    const px = []; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++){ const c = rgb[(ty * 8 + y) * W + tx * 8 + x]; px.push([(c >> 16) & 255, (c >> 8) & 255, c & 255]); }
    tiles.push({ tx, ty, px, mean:[0, 1, 2].map(k=>px.reduce((s, p)=>s + p[k], 0) / 64) });
  }
  const d2 = (a, b)=>(a[0] - b[0]) ** 2 * 3 + (a[1] - b[1]) ** 2 * 4 + (a[2] - b[2]) ** 2 * 2;
  const cut = (px, n)=>{
    let boxes = [px.slice()];
    while (boxes.length < n){
      boxes.sort((a, b)=>b.length - a.length); const box = boxes.shift(); if (!box || box.length < 2){ if (box) boxes.push(box); break; }
      const rng = [0, 1, 2].map(k=>Math.max(...box.map(p=>p[k])) - Math.min(...box.map(p=>p[k]))), k = rng.indexOf(Math.max(...rng));
      box.sort((a, b)=>a[k] - b[k]); boxes.push(box.slice(0, box.length >> 1), box.slice(box.length >> 1));
    }
    return boxes.filter(b=>b.length).map(b=>[0, 1, 2].map(k=>Math.round(b.reduce((s, p)=>s + p[k], 0) / b.length / 8) * 8));
  };
  // famiglie iniziali: tile ordinati per luminosità e divisi in K gruppi
  const sorted = tiles.slice().sort((a, b)=>(a.mean[0] + a.mean[1] + a.mean[2]) - (b.mean[0] + b.mean[1] + b.mean[2]));
  sorted.forEach((t, i)=>{ t.g = Math.min(K - 1, (i * K / sorted.length) | 0); });
  let pals = [];
  const err = (t, pal)=>t.px.reduce((s, p)=>s + Math.min(...pal.map(q=>d2(p, q))), 0);
  for (let it = 0; it < 5; it++){
    pals = [];
    for (let g = 0; g < K; g++){ const px = tiles.filter(t=>t.g === g).flatMap(t=>t.px); pals.push(px.length ? cut(px, 15) : [[0, 0, 0]]); }
    for (const t of tiles){ let best = 0, be = Infinity; pals.forEach((p, g)=>{ const e = err(t, p); if (e < be){ be = e; best = g; } }); t.g = best; }
  }
  const out = new Int32Array(W * H);
  for (const t of tiles){ const pal = pals[t.g]; t.px.forEach((p, k)=>{ let best = pal[0], bd = Infinity; for (const q of pal){ const d = d2(p, q); if (d < bd){ bd = d; best = q; } } out[(t.ty * 8 + (k >> 3)) * W + t.tx * 8 + (k & 7)] = (best[0] << 16) | (best[1] << 8) | best[2]; }); }
  return out;
}
