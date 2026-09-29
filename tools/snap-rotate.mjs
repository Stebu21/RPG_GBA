// sposta l'istantanea appena salvata da GDB (build/snap/cur) in una cartella numerata
import { readdirSync, renameSync, mkdirSync } from 'node:fs';
const n = readdirSync('build/snap').filter(d=>/^\d+$/.test(d)).length + 1;
mkdirSync(`build/snap/${n}`);
for (const f of readdirSync('build/snap/cur')) renameSync(`build/snap/cur/${f}`, `build/snap/${n}/${f}`);
