// Controllo automatico della ROM: partita guidata (src/autotest.c) in mGBA, istantanee via GDB,
// immagini ricostruite in build/snap/NN.png e verifiche sullo stato del gioco.
// uso: node tools/check.mjs
import { execFileSync, spawn } from 'node:child_process';
import { writeFileSync, rmSync, mkdirSync, readdirSync, renameSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { renderSnap } from './render.mjs';

const BIN = 'C:/Program Files (x86)/Arm GNU Toolchain arm-none-eabi/14.2 rel1/bin/';
execFileSync('node', ['tools/build.mjs', '--test'], { stdio:'inherit' });
rmSync('build/snap', { recursive:true, force:true }); mkdirSync('build/snap/cur', { recursive:true });
rmSync('build/menace-test.sav', { force:true });

const dump = (name, from, to)=>`  dump binary memory build/snap/cur/${name}.bin ${from} ${to}`;
writeFileSync('build/check.gdb', [
  'set pagination off', 'set confirm off', 'target remote localhost:2345',
  'break testSnap', 'commands', '  silent',
  dump('vram', '0x06000000', '0x06018000'), dump('pal', '0x05000000', '0x05000400'), dump('oam', '0x07000000', '0x07000400'), dump('io', '0x04000000', '0x04000060'), dump('shadow', '&ioShadow', '((char*)&ioShadow)+18'),
  '  printf "SNAP %d map=%d x=%d y=%d hero=%d nparty=%d gold=%d hp0=%d hp1=%d lv0=%d flags0=%d steps=%d pozioni=%d joined=%d saved=%d quest=%d chests=%d\\n", $r0, G.map, G.x, G.y, G.hero, G.nparty, G.gold, G.ch[0].hp, G.ch[1].hp, G.ch[0].level, G.flags[0], G.steps, G.inv[0], G.joined, saveVerified, G.quest[3], G.chests[0] | G.chests[1] << 8',
  '  shell node tools/snap-rotate.mjs', '  continue', 'end',
  'break testDone', 'commands', '  silent', '  printf "DONE\\n"', '  kill', '  quit', 'end',
  'continue',
].join('\n'));

const emu = spawn('C:/Program Files/mGBA/mGBA.exe', ['-C', 'pauseOnFocusLost=0', '-C', 'pauseOnMinimize=0', '-C', 'mute=1', '-g', 'build/menace-test.gba'], { stdio:'ignore' });
await new Promise(r=>setTimeout(r, 2500));
let out = '';
try { out = execFileSync(BIN + 'arm-none-eabi-gdb.exe', ['-batch', '-x', 'build/check.gdb', 'build/menace-test.elf'], { timeout:480000 }).toString(); }
catch (e){ out = (e.stdout || '').toString(); console.log('gdb interrotto:', e.message.split('\n')[0]); }
emu.kill();
try { execFileSync('taskkill', ['/IM', 'mGBA.exe', '/F'], { stdio:'ignore' }); } catch {}

const snaps = {};
for (const l of out.split('\n')) if (l.startsWith('SNAP')){ const p = Object.fromEntries(l.trim().split(' ').slice(2).map(kv=>kv.split('=')).map(([k, v])=>[k, +v])); snaps[+l.split(' ')[1]] = p; }
for (const d of readdirSync('build/snap').filter(d=>/^\d+$/.test(d))) renderSnap('build/snap/' + d, `build/snap/${d.padStart(2, '0')}.png`);
console.log(Object.entries(snaps).map(([k, v])=>`${k}: ${JSON.stringify(v)}`).join('\n'));
console.log(out.includes('DONE') ? 'partita automatica completata' : 'partita automatica NON completata');

// verifiche
assert.ok(snaps[5] && snaps[5].map === 1 || snaps[5]?.map >= 0, 'nessuna istantanea della partita');
assert.equal(snaps[6]?.flags0 & 1, 1, 'l’intro non ha impostato intro_done');
assert.ok(snaps[7] && snaps[7].map !== snaps[6].map, 'non si esce dall’Accademia');
assert.ok(snaps[13] && snaps[13].gold > snaps[10].gold, 'la battaglia non ha dato oro');
assert.ok(snaps[14]?.saved === 1, 'salvataggio non scritto in SRAM');
assert.ok(snaps[16] && snaps[16].pozioni > snaps[14].pozioni && snaps[16].gold < snaps[14].gold, 'il negozio non vende');
assert.equal(snaps[18]?.map, 3, 'non si torna a Vedano dopo il Lazzaretto');
assert.ok(snaps[19] && snaps[19].nparty === 4 && (snaps[19].joined & 0xFC), 'a Castiglione non si unisce nessuno');
assert.ok(snaps[20] && snaps[20].flags0 & 0x40, 'Jerago non completato (Sigillo del Vespro)');
assert.equal(snaps[23]?.quest, 1, 'la missione dei lupi non è stata accettata');
assert.ok(snaps[24]?.chests, 'il forziere del parco non si apre');
assert.equal(snaps[25]?.map, 0, 'non si arriva sulla mappa del mondo');
assert.ok(snaps[27] && snaps[29] && snaps[29].map === snaps[9].map, 'la mappa consultabile non si apre o non torna al menu');
assert.ok(snaps[99], 'il finale non è arrivato');
assert.ok(out.includes('DONE'), 'partita non completata');
console.log('CHECK OK');
