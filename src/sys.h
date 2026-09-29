// Sistema: fotogrammi, sprite, dissolvenze, tasti, suono, numeri casuali.
#pragma once
#include "gba.h"

// ---------- fotogrammi e sprite ----------
void sysInit(void);
void frame(void);                 // attende il VBlank, copia gli sprite, aggiorna suono e animazioni
extern u32 frameCount;
extern OamEntry oamBuf[128];
void oamHideAll(void);
void oamSet(int i, int x, int y, u16 attr0, u16 attr1, u16 attr2);
#define OBJ_TALL (2 << 14)        // forma verticale
#define OBJ_WIDE (1 << 14)
#define OBJ_SQUARE 0
#define OBJ_SIZE(n) ((n) << 14)
#define OBJ_HFLIP (1 << 12)
#define OBJ_AFFINE (1 << 8)
#define OBJ_DOUBLE (3 << 8)
#define OBJ_HIDE (2 << 8)
#define OBJ_PAL(n) ((n) << 12)
#define OBJ_PRIO(n) ((n) << 10)
void setAffine(int n, s16 pa, s16 pb, s16 pc, s16 pd);
void fadeOut(int frames);
void fadeIn(int frames);
void setBrightness(int level);    // -16 nero .. 0 normale
extern void (*frameHook)(void);  // chiamata a ogni fotogramma (animazione dell'acqua ecc.)

// ---------- tasti ----------
extern u16 keysHeld, keysHit, keysRep;
void keysUpdate(void);
#ifdef AUTOTEST
extern volatile u32 testWorldIdle, testWaiting;
#define TEST_WAITING() (testWaiting = frameCount)
#define TEST_IDLE() (testWorldIdle = frameCount)
#else
#define TEST_WAITING()
#define TEST_IDLE()
#endif
#ifdef AUTOTEST
void autotestKeys(u16 *held);     // tasti simulati dalla partita automatica
#endif

// ---------- numeri casuali ----------
u32 rnd(void);
static inline int rndRange(int n){ return (int)(((rnd() >> 16) * (u32)n) >> 16); }

// ---------- suono ----------
enum { MUS_TITLE, MUS_WORLD, MUS_TOWN, MUS_DUNGEON, MUS_BATTLE, MUS_BOSS, MUS_VICTORY, MUS_ENDING, MUS_NONE = 255 };
void musicPlay(int song);
void musicStop(void);
void soundUpdate(void);
enum { SFX_CURSOR, SFX_OK, SFX_CANCEL, SFX_HIT, SFX_CRIT, SFX_MAGIC, SFX_HEAL, SFX_BUMP, SFX_DOOR, SFX_LEVEL, SFX_ENC, SFX_ITEM };
void sfx(int id);

// ---------- memoria di salvataggio ----------
void sramWrite(u32 off, const void *src, u32 n);
void sramRead(u32 off, void *dst, u32 n);
