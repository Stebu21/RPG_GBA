// Sistema: VBlank con interrupt, sprite in ombra, dissolvenze, tasti, musica a due voci, SRAM.
#include "sys.h"
#include "data.h"

u32 frameCount;
volatile u16 ioShadow[9];
OamEntry oamBuf[128];
void (*frameHook)(void);
u16 keysHeld, keysHit, keysRep;
static volatile u32 vblanks;

__attribute__((target("arm"), noinline, section(".iwram")))
static void isr(void){
  u16 f = REG_IF;
  if (f & 1) vblanks++;
  REG_IFBIOS |= f;
  REG_IF = f;
}

void sysInit(void){
  REG_WAITCNT = 0x4317;                     // ROM più veloce (3/1 attese, prefetch)
  REG_ISR_MAIN = isr;
  REG_DISPSTAT = 1 << 3;                    // interrupt al VBlank
  REG_IE = 1; REG_IME = 1;
  // suono: canali 1, 2 e 4 su entrambi i lati
  REG_SOUNDCNT_X = 0x80;
  REG_SOUNDCNT_L = 7 | (7 << 4) | (0xB << 8) | (0xB << 12);
  REG_SOUNDCNT_H = 2;
  REG_SOUND1CNT_L = 0;
  oamHideAll();
}

void oamHideAll(void){ for (int i = 0; i < 128; i++){ oamBuf[i].a0 = OBJ_HIDE; oamBuf[i].a1 = 0; oamBuf[i].a2 = 0; } }
void oamSet(int i, int x, int y, u16 a0, u16 a1, u16 a2){
  if (x < -64 || x > 240 || y < -64 || y > 160){ oamBuf[i].a0 = OBJ_HIDE; return; }
  oamBuf[i].a0 = (a0 & ~0xFF) | (y & 0xFF);
  oamBuf[i].a1 = (a1 & ~0x1FF) | (x & 0x1FF);
  oamBuf[i].a2 = a2;
}
void setAffine(int n, s16 pa, s16 pb, s16 pc, s16 pd){
  oamBuf[n * 4].fill = pa; oamBuf[n * 4 + 1].fill = pb; oamBuf[n * 4 + 2].fill = pc; oamBuf[n * 4 + 3].fill = pd;
}

void frame(void){
  // attende il prossimo VBlank (BIOS: VBlankIntrWait)
  asm volatile("swi 0x05" ::: "r0", "r1", "r2", "r3", "memory");
  volatile u16 *o = (volatile u16*)MEM_OAM; const u16 *s = (const u16*)oamBuf;
  for (int i = 0; i < 128 * 4; i++) o[i] = s[i];
  frameCount++;
  if (frameHook) frameHook();
  soundUpdate();
  keysUpdate();
}

void setBrightness(int level){
  if (level >= 0){ REG_BLDCNT = 0; return; }
  REG_BLDCNT = 0x3F | (3 << 6);             // schiarisci/scurisci tutti i livelli: 3 = verso il nero
  setBldy(-level > 16 ? 16 : -level);
}
void fadeOut(int frames){ for (int i = 0; i <= frames; i++){ setBrightness(-(i * 16 / frames)); frame(); } }
void fadeIn(int frames){ for (int i = frames; i >= 0; i--){ setBrightness(-(i * 16 / frames)); frame(); } setBrightness(0); }

// ---------- tasti: premuti, appena premuti, ripetizione per scorrere i menu ----------
void keysUpdate(void){
  static u16 prev; static int rep;
  u16 now = ~REG_KEYINPUT & 0x3FF;
#ifdef AUTOTEST
  autotestKeys(&now);
#endif
  keysHit = now & ~prev;
  keysRep = keysHit;
  if (now && now == prev){ if (++rep > 18 && (rep & 3) == 0) keysRep = now; } else rep = 0;
  prev = now; keysHeld = now;
}

u32 rnd(void){ static u32 s = 0x2F6E2B1; s ^= s << 13; s ^= s >> 17; s ^= s << 5; s += frameCount * 0x9E3779B9u; return s; }

// ---------- musica: melodia (quadra 1) + basso (quadra 2), effetti sonori sulla quadra 1 ----------
static const u16 P3[12] = { 1002, 946, 893, 843, 795, 751, 709, 669, 631, 596, 562, 531 };   // 131072/f nell'ottava 3
static u16 rateOf(int midi){
  int o = midi / 12 - 1, k = midi % 12;
  u32 p = P3[k];
  if (o > 3) p >>= (o - 3); else while (o < 3){ p <<= 1; o++; }
  while (p > 2040) p >>= 1;                 // note troppo basse: un'ottava sopra
  return 2048 - p;
}
static const Song *song; static u16 mi, bi, mt, bt, tick; static u8 songId = 255;
static int sfxTimer;
void musicPlay(int id){
  if (id == songId) return;
  songId = id;
  if (id == MUS_NONE){ song = 0; REG_SOUND1CNT_H = 0; REG_SOUND2CNT_L = 0; return; }
  song = &SONGS[id]; mi = bi = 0; mt = bt = 0; tick = 0;
}
void musicStop(void){ musicPlay(MUS_NONE); }
static void playNote(int ch, int midi, int vol, int duty, int decay){
  if (ch == 1){
    if (!midi){ REG_SOUND1CNT_H = 0; REG_SOUND1CNT_X = 0x8000; return; }
    REG_SOUND1CNT_L = 0; REG_SOUND1CNT_H = (duty << 6) | (decay << 8) | (vol << 12); REG_SOUND1CNT_X = rateOf(midi) | 0x8000;
  } else {
    if (!midi){ REG_SOUND2CNT_L = 0; REG_SOUND2CNT_H = 0x8000; return; }
    REG_SOUND2CNT_L = (duty << 6) | (decay << 8) | (vol << 12); REG_SOUND2CNT_H = rateOf(midi) | 0x8000;
  }
}
void soundUpdate(void){
  if (sfxTimer > 0) sfxTimer--;
  if (!song) return;
  if (++tick < song->tempo) return;
  tick = 0;
  if (mt == 0){
    if (mi >= song->nmel){ if (!song->loop){ song = 0; return; } mi = bi = 0; bt = 0; }
    int n = song->mel[mi * 2]; mt = song->mel[mi * 2 + 1]; mi++;
    if (sfxTimer <= 0) playNote(1, n, 9, 2, 3);
  }
  if (bt == 0 && bi < song->nbass){ int n = song->bass[bi * 2]; bt = song->bass[bi * 2 + 1]; bi++; playNote(2, n, 7, 1, 4); }
  if (mt) mt--;
  if (bt) bt--;
}
void sfx(int id){
  switch (id){
    case SFX_CURSOR: playNote(1, 84, 8, 2, 1); sfxTimer = 4; break;
    case SFX_OK:     playNote(1, 88, 10, 2, 2); sfxTimer = 8; break;
    case SFX_CANCEL: playNote(1, 72, 9, 2, 1); sfxTimer = 6; break;
    case SFX_BUMP:   playNote(1, 48, 7, 1, 1); sfxTimer = 5; break;
    case SFX_DOOR:   playNote(1, 67, 9, 2, 2); sfxTimer = 10; break;
    case SFX_MAGIC:  REG_SOUND1CNT_L = 0x27; REG_SOUND1CNT_H = (2 << 6) | (4 << 8) | (12 << 12); REG_SOUND1CNT_X = rateOf(79) | 0x8000; sfxTimer = 20; break;
    case SFX_HEAL:   REG_SOUND1CNT_L = 0x16; REG_SOUND1CNT_H = (2 << 6) | (5 << 8) | (10 << 12); REG_SOUND1CNT_X = rateOf(84) | 0x8000; sfxTimer = 24; break;
    case SFX_LEVEL:  playNote(1, 91, 12, 2, 5); sfxTimer = 30; break;
    case SFX_ITEM:   playNote(1, 86, 11, 2, 4); sfxTimer = 20; break;
    case SFX_HIT: case SFX_CRIT: case SFX_ENC:
      REG_SOUND4CNT_L = (id == SFX_ENC ? 3 : 1) << 8 | (id == SFX_CRIT ? 15 : 12) << 12;
      REG_SOUND4CNT_H = (id == SFX_CRIT ? 0x31 : id == SFX_ENC ? 0x55 : 0x42) | 0x8000; break;
  }
}

// ---------- SRAM: bus a 8 bit, un byte alla volta ----------
void sramWrite(u32 off, const void *src, u32 n){ const u8 *s = src; for (u32 i = 0; i < n; i++) MEM_SRAM[off + i] = s[i]; }
void sramRead(u32 off, void *dst, u32 n){ u8 *d = dst; for (u32 i = 0; i < n; i++) d[i] = MEM_SRAM[off + i]; }
