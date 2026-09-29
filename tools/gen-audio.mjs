// Musiche originali a due voci (melodia su onda quadra 1, basso su onda quadra 2).
// Notazione: "C4:2" = do della 4ª ottava per 2 tick, "-:2" = pausa. Ordine: vedi MUSIC in gen-maps.mjs.
import { cArray } from './pixel.mjs';

const N = { C:0, 'C#':1, D:2, 'D#':3, E:4, F:5, 'F#':6, G:7, 'G#':8, A:9, 'A#':10, B:11 };
const parse = s=>s.trim().split(/\s+/).flatMap(tok=>{ const [n, l] = tok.split(':'); if (n === '-') return [0, +l]; const m = n.match(/^([A-G]#?)(\d)$/); return [12 * (+m[2] + 1) + N[m[1]], +l]; });
const rep = (s, k)=>Array(k).fill(s).join(' ');

const SONGS = [
  // titolo: arpeggio in la minore, lento e misterioso
  { tempo:9, loop:1,
    mel:'A4:4 C5:4 E5:4 A5:8 G5:4 E5:4 F5:4 E5:4 D5:4 C5:8 B4:8 - :4 A4:4 C5:4 E5:4 A5:8 B5:4 C6:4 B5:4 A5:4 G5:4 E5:12 -:4'.replace('- :4', '-:4'),
    bass:rep('A2:8 E3:8', 2) + ' ' + rep('F2:8 C3:8', 1) + ' G2:8 D3:8 ' + rep('A2:8 E3:8', 2) + ' F2:8 G2:8 E2:16' },
  // mondo: marcia in do maggiore, allegra
  { tempo:6, loop:1,
    mel:'C5:2 E5:2 G5:4 E5:2 G5:2 C6:4 B5:2 A5:2 G5:4 E5:4 F5:2 A5:2 C6:4 A5:2 F5:2 D5:4 E5:2 F5:2 G5:8 C5:2 E5:2 G5:4 E5:2 G5:2 C6:4 D6:2 C6:2 B5:4 G5:4 A5:2 B5:2 C6:4 G5:2 E5:2 D5:4 C5:12',
    bass:'C3:4 G3:4 C3:4 G3:4 G2:4 D3:4 C3:4 G3:4 F2:4 C3:4 F2:4 C3:4 G2:4 D3:4 G2:4 D3:4 C3:4 G3:4 C3:4 G3:4 G2:4 D3:4 C3:4 E3:4 F2:4 G2:4 G2:4 B2:4 C3:16' },
  // paese: pastorale in fa maggiore
  { tempo:8, loop:1,
    mel:'F5:3 G5:1 A5:4 C6:4 A5:4 G5:3 F5:1 G5:4 D5:8 E5:3 F5:1 G5:4 A5:4 G5:4 F5:3 E5:1 F5:12 -:4 A5:3 A#5:1 C6:4 D6:4 C6:4 A5:3 G5:1 A5:4 F5:8 G5:4 A5:4 G5:4 E5:4 F5:16',
    bass:'F3:8 C3:8 A#2:8 F3:8 C3:8 G2:8 F3:8 C3:8 F3:8 C3:8 A#2:8 F2:8 C3:8 C3:8 F2:16' },
  // luoghi oscuri: re minore, lento
  { tempo:10, loop:1,
    mel:'D5:6 F5:2 E5:4 C#5:4 D5:6 A4:2 A#4:8 G4:6 A#4:2 A4:4 F4:4 E4:12 -:4 D5:6 F5:2 G5:4 A5:4 A#5:6 A5:2 G5:8 F5:4 E5:4 C#5:4 E5:4 D5:16',
    bass:'D2:8 A2:8 D2:8 A#1:8 G2:8 D2:8 A1:16 D2:8 A2:8 G2:8 A#1:8 A1:8 A1:8 D2:16' },
  // battaglia: mi minore incalzante
  { tempo:4, loop:1,
    mel:'E5:2 E5:1 E5:1 G5:2 E5:2 B5:2 A5:2 G5:2 F#5:2 E5:2 E5:1 E5:1 G5:2 B5:2 D6:4 B5:4 C6:2 C6:1 C6:1 B5:2 A5:2 G5:2 A5:2 B5:4 A5:2 G5:2 F#5:2 D5:2 E5:8',
    bass:rep('E3:1 E3:1 B3:1 E3:1', 4) + ' ' + rep('C3:1 C3:1 G3:1 C3:1', 2) + ' ' + rep('D3:1 D3:1 A3:1 D3:1', 2) + ' ' + rep('E3:1 E3:1 B3:1 E3:1', 4) },
  // boss: do minore, più veloce e pesante
  { tempo:3, loop:1,
    mel:'C5:2 D#5:2 G5:2 C6:2 B5:2 G5:2 D#5:2 D5:2 C5:2 D#5:2 G#5:4 G5:4 F5:2 D#5:2 D5:2 F5:2 G5:4 D5:4 C5:2 D#5:2 G5:2 C6:2 D6:2 D#6:2 D6:2 C6:2 G#5:2 G5:2 F5:2 D#5:2 D5:4 C5:4',
    bass:rep('C3:1 C3:1 C3:1 G3:1', 4) + ' ' + rep('G#2:1 G#2:1 G#2:1 D#3:1', 2) + ' ' + rep('G2:1 G2:1 G2:1 D3:1', 2) + ' ' + rep('C3:1 C3:1 C3:1 G3:1', 2) + ' ' + rep('G#2:1 G#2:1 G2:1 G2:1', 2) },
  // vittoria: fanfara breve
  { tempo:5, loop:0,
    mel:'C5:1 C5:1 C5:1 C5:3 G#4:3 A#4:3 C5:2 A#4:1 C5:8',
    bass:'C3:3 C3:3 G#2:3 A#2:3 C3:8' },
  // finale: sol maggiore sereno
  { tempo:9, loop:1,
    mel:'G5:4 B5:4 D6:8 C6:4 B5:4 A5:8 B5:4 G5:4 E5:4 F#5:4 G5:12 -:4 E5:4 G5:4 C6:8 B5:4 A5:4 G5:4 E5:4 D5:4 F#5:4 A5:4 C6:4 B5:16',
    bass:'G2:8 D3:8 C3:8 D3:8 G2:8 C3:8 D3:8 G2:8 C3:8 E3:8 G2:8 E2:8 D3:8 D3:8 G2:16' },
];
export function genAudio(){
  let c = '';
  const defs = SONGS.map((s, i)=>{
    const mel = parse(s.mel), bass = parse(s.bass);
    c += cArray('u8', `SONG_MEL_${i}`, mel) + cArray('u8', `SONG_BASS_${i}`, bass);
    return `{ SONG_MEL_${i}, ${mel.length / 2}, SONG_BASS_${i}, ${bass.length / 2}, ${s.tempo}, ${s.loop} }`;
  });
  return c + `const Song SONGS[] = { ${defs.join(', ')} };\n`;
}
