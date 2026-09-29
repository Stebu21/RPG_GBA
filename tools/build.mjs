// Compila la ROM: node tools/build.mjs [--test]  -> build/menace.gba (o build/menace-test.gba)
// --test attiva la partita automatica usata dai controlli (tools/check.mjs).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BIN = 'C:/Program Files (x86)/Arm GNU Toolchain arm-none-eabi/14.2 rel1/bin/';
const test = process.argv.includes('--test');
const out = test ? 'build/menace-test' : 'build/menace';
mkdirSync('build', { recursive:true });
if (!existsSync('gen/assets.c') || process.argv.includes('--assets')) execFileSync('node', ['tools/gen-assets.mjs'], { stdio:'inherit' });

const CFLAGS = ['-mcpu=arm7tdmi', '-mthumb', '-mthumb-interwork', '-O2', '-Wall', '-Wno-unused-function', '-ffreestanding',
  '-fno-strict-aliasing', '-Isrc', '-Igen', ...(test ? ['-DAUTOTEST', '-g'] : [])];
const srcs = [...readdirSync('src').filter(f=>f.endsWith('.c')).map(f=>join('src', f)), ...readdirSync('gen').filter(f=>f.endsWith('.c')).map(f=>join('gen', f))];
const objs = [];
execFileSync(BIN + 'arm-none-eabi-gcc.exe', ['-mcpu=arm7tdmi', '-c', 'src/crt0.s', '-o', 'build/crt0.o'], { stdio:'inherit' });
objs.push('build/crt0.o');
for (const s of srcs){
  const o = join('build', s.replace(/[\\/]/g, '_').replace(/\.c$/, (test ? '.t' : '') + '.o'));
  execFileSync(BIN + 'arm-none-eabi-gcc.exe', [...CFLAGS, '-c', s, '-o', o], { stdio:'inherit' });
  objs.push(o);
}
execFileSync(BIN + 'arm-none-eabi-gcc.exe', ['-mcpu=arm7tdmi', '-mthumb-interwork', '-nostartfiles', '-Tsrc/gba.ld', '-Wl,--gc-sections', ...objs,
  '-lc', '-lgcc', '-o', out + '.elf'], { stdio:'inherit' });
execFileSync(BIN + 'arm-none-eabi-objcopy.exe', ['-O', 'binary', out + '.elf', out + '.gba']);

// checksum dell'intestazione (byte 0xBD) e ROM allineata a 256 byte
let rom = readFileSync(out + '.gba');
let sum = 0; for (let i = 0xA0; i <= 0xBC; i++) sum += rom[i];
rom[0xBD] = (-(sum + 0x19)) & 0xFF;
const pad = (256 - rom.length % 256) % 256;
if (pad) rom = Buffer.concat([rom, Buffer.alloc(pad, 0xFF)]);
writeFileSync(out + '.gba', rom);
const size = execFileSync(BIN + 'arm-none-eabi-size.exe', [out + '.elf']).toString().trim().split('\n')[1];
console.log(`${out}.gba  ${(rom.length / 1024).toFixed(0)} KB   [text data bss] ${size.trim().split(/\s+/).slice(0, 3).join(' ')}`);
