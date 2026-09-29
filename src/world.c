// Esplorazione: mappa a metatile 16x16 con scorrimento, movimento a caselle, compagno, NPC, trigger.
#include "world.h"
#include "state.h"
#include "sys.h"
#include "text.h"
#include "script.h"
#include "battle.h"
#include "menu.h"
#include <stdlib.h>

#define MAP_SB 28                   // schermata BG1 (32x32 tile, ad anello)
#define SLOT_TILE(k) (32 + (k) * 8) // tile OBJ per ogni personaggio sulla mappa (un fotogramma 16x32)
#define MAX_NPC 14

const MapDef *curMap;
static int camX, camY, drawnMX = -99, drawnMY = -99;
typedef struct { s16 px, py; u8 dir, look, frame, moving, slot; s8 step; const Trigger *t; u8 shownFrame; } Actor;
static Actor player, mate, npcs[MAX_NPC];
static int nNpc;
static u8 animPhase;
static Win *namePop; static int namePopT;   // cartello col nome della mappa

// ---------- grafica della mappa ----------
static void putMeta(int mx, int my){
  u16 *sb = SCREENBLOCK(MAP_SB);
  int tx = (mx & 15) * 2, ty = (my & 15) * 2;
  const u16 *m;
  static const u16 empty[4] = { 0, 0, 0, 0 };
  if (mx < 0 || my < 0 || mx >= curMap->w || my >= curMap->h) m = empty;
  else m = &curMap->meta[curMap->cells[my * curMap->w + mx] * 4];
  sb[ty * 32 + tx] = m[0]; sb[ty * 32 + tx + 1] = m[1]; sb[(ty + 1) * 32 + tx] = m[2]; sb[(ty + 1) * 32 + tx + 1] = m[3];
}
static void drawView(int force){
  int mx = camX >> 4, my = camY >> 4;
  if (!force && mx == drawnMX && my == drawnMY) return;
  // ridisegna solo le righe/colonne nuove quando la camera si sposta di una casella
  if (!force && abs(mx - drawnMX) <= 1 && abs(my - drawnMY) <= 1){
    if (mx != drawnMX){ int col = mx > drawnMX ? mx + 15 : mx; for (int y = my; y <= my + 10; y++) putMeta(col, y); }
    if (my != drawnMY){ int row = my > drawnMY ? my + 10 : my; for (int x = mx; x <= mx + 15; x++) putMeta(x, row); }
  } else {
    for (int y = my; y <= my + 10; y++) for (int x = mx; x <= mx + 15; x++) putMeta(x, y);
  }
  drawnMX = mx; drawnMY = my;
}
static void mapAnim(void){
  if (!curMap || !curMap->nanim || (frameCount & 31)) return;
  animPhase ^= 1;
  for (int i = 0; i < curMap->nanim; i++){
    u16 dst = curMap->anim[i * 2], src = animPhase ? curMap->anim[i * 2 + 1] : dst;
    memcpy16(CHARBLOCK(1) + dst * 16, curMap->tiles + src * 16, 16);
  }
}

// ---------- sprite dei personaggi ----------
static void loadActorPal(int slot, int look){ for (int i = 0; i < 16; i++) MEM_PAL_OBJ[(slot + 1) * 16 + i] = LOOKS[look].pal[i]; }
static void actorFrame(Actor *a){
  int dirIdx = a->dir == DIR_DOWN ? 0 : a->dir == DIR_UP ? 1 : 2;
  int f = dirIdx * 3 + a->frame;
  if (f == a->shownFrame) return;
  a->shownFrame = f;
  memcpy16(OBJ_TILES + SLOT_TILE(a->slot) * 16, LOOKS[a->look].tiles + f * 128, 128);
}
static void drawActor(int oam, Actor *a){
  actorFrame(a);
  int sx = a->px - camX, sy = a->py - camY - 16;
  oamSet(oam, sx, sy, OBJ_TALL, OBJ_SIZE(2) | (a->dir == DIR_RIGHT ? OBJ_HFLIP : 0), SLOT_TILE(a->slot) | OBJ_PAL(a->slot + 1) | OBJ_PRIO(1));
}
void worldDrawActors(void){
  // ordine: chi è più in basso sullo schermo sta davanti (indice OAM più basso)
  Actor *list[MAX_NPC + 2]; int n = 0;
  list[n++] = &player; if (G.nparty > 1) list[n++] = &mate;
  for (int i = 0; i < nNpc; i++) list[n++] = &npcs[i];
  for (int i = 1; i < n; i++) for (int j = i; j > 0 && list[j]->py > list[j - 1]->py; j--){ Actor *t = list[j]; list[j] = list[j - 1]; list[j - 1] = t; }
  for (int i = 0; i < n; i++) drawActor(i + 2, list[i]);
  for (int i = n; i < MAX_NPC + 2; i++) oamBuf[i + 2].a0 = OBJ_HIDE;
  // forzieri (sprite 16x16 dell'interfaccia) dopo gli attori
  int o = MAX_NPC + 4;
  for (int i = 0; i < curMap->ntrig && o < 60; i++){
    const Trigger *t = &curMap->trig[i];
    if (t->type != T_CHEST) continue;
    int open = (G.chests[t->a >> 3] >> (t->a & 7)) & 1;
    oamSet(o++, t->x * 16 - camX, t->y * 16 - camY, OBJ_SQUARE, OBJ_SIZE(1), (open ? 16 : 12) | OBJ_PAL(0) | OBJ_PRIO(1));
  }
  while (o < 60) oamBuf[o++].a0 = OBJ_HIDE;
}

// ---------- camera ----------
static void updateCamera(void){
  int w = curMap->w * 16, h = curMap->h * 16;
  camX = player.px + 8 - 120; camY = player.py + 8 - 88;
  if (w <= 240) camX = (w - 240) / 2; else { if (camX < 0) camX = 0; if (camX > w - 240) camX = w - 240; }
  if (h <= 160) camY = (h - 160) / 2; else { if (camY < 0) camY = 0; if (camY > h - 160) camY = h - 160; }
  // la schermata ad anello è di 32x32 tile: gli offset vanno presi modulo 256
  setScroll(1, camX & 255, camY & 255);
  drawView(0);
}

// ---------- caselle ----------
static const Trigger *triggerAt(int x, int y){
  for (int i = 0; i < curMap->ntrig; i++){ const Trigger *t = &curMap->trig[i]; if (t->x == x && t->y == y && (t->hide == 255 || !flagGet(t->hide))) return t; }
  return 0;
}
static int attrAt(int x, int y){ if (x < 0 || y < 0 || x >= curMap->w || y >= curMap->h) return MA_BLOCK; return curMap->attr[curMap->cells[y * curMap->w + x]]; }
static int passable(int x, int y){
  if (attrAt(x, y) & MA_BLOCK) return 0;
  const Trigger *t = triggerAt(x, y);
  if (t && (t->type == T_NPC || t->type == T_QUEST || t->type == T_CHEST)) return 0;
  return 1;
}

// ---------- caricamento ----------
static void loadNpcs(void){
  nNpc = 0;
  for (int i = 0; i < curMap->ntrig && nNpc < MAX_NPC; i++){
    const Trigger *t = &curMap->trig[i];
    if (t->type != T_NPC && t->type != T_QUEST) continue;
    if (t->hide != 255 && flagGet(t->hide)) continue;
    Actor *a = &npcs[nNpc]; *a = (Actor){ t->x * 16, t->y * 16, DIR_DOWN, t->look, 0, 0, 2 + nNpc, 0, t, 255 };
    loadActorPal(a->slot, a->look); nNpc++;
  }
}
static int mapMusic(void){ return curMap->music; }
void worldLoad(int map, int x, int y, int dir){
  curMap = &MAPS[map];
  G.map = map; G.x = x; G.y = y; G.dir = dir;
  // grafica: tile in charblock 1, tavolozze 1-7
  memcpy16(CHARBLOCK(1), curMap->tiles, curMap->ntiles * 16);
  for (int p = 1; p < 8; p++) for (int i = 0; i < 16; i++) MEM_PAL_BG[p * 16 + i] = BG_PALETTES[p][i];
  MEM_PAL_BG[0] = curMap->flags & MF_INDOOR ? RGB15(1, 1, 3) : BG_PALETTES[2][3];
  REG_BGCNT(1) = 2 | (1 << 2) | (MAP_SB << 8);
  player = (Actor){ x * 16, y * 16, dir, G.hero, 0, 0, 0, 0, 0, 255 };
  loadActorPal(0, G.hero);
  int partner = G.hero == CH_STE ? CH_RIKI : CH_STE;
  // il compagno parte dietro al giocatore, se c'è posto
  int bx = x, by = y;
  if (dir == DIR_DOWN && passable(x, y - 1)) by = y - 1; else if (dir == DIR_UP && passable(x, y + 1)) by = y + 1;
  else if (dir == DIR_LEFT && passable(x + 1, y)) bx = x + 1; else if (dir == DIR_RIGHT && passable(x - 1, y)) bx = x - 1;
  mate = (Actor){ bx * 16, by * 16, dir, partner, 0, 0, 1, 0, 0, 255 };
  loadActorPal(1, partner);
  loadNpcs();
  drawnMX = -99; updateCamera(); drawView(1);
  frameHook = mapAnim;
  musicPlay(mapMusic());
  if (curMap->flags & MF_TOWN) G.visited |= 1 << (map & 7);
  worldDrawActors();
  REG_DISPCNT = DCNT_MODE0 | DCNT_BG(0) | DCNT_BG(1) | DCNT_OBJ | DCNT_OBJ_1D;
}
void worldRedraw(void){
  namePop = 0; namePopT = 0;
  memcpy16(CHARBLOCK(1), curMap->tiles, curMap->ntiles * 16);
  for (int p = 1; p < 8; p++) for (int i = 0; i < 16; i++) MEM_PAL_BG[p * 16 + i] = BG_PALETTES[p][i];
  MEM_PAL_BG[0] = curMap->flags & MF_INDOOR ? RGB15(1, 1, 3) : BG_PALETTES[2][3];
  REG_BGCNT(1) = 2 | (1 << 2) | (MAP_SB << 8);
  loadActorPal(0, player.look); loadActorPal(1, mate.look);
  for (int i = 0; i < nNpc; i++){ loadActorPal(npcs[i].slot, npcs[i].look); npcs[i].shownFrame = 255; }
  player.shownFrame = mate.shownFrame = 255;
  textInit();
  frameHook = mapAnim;
  drawnMX = -99; updateCamera(); drawView(1);
  oamHideAll(); worldDrawActors();
  musicPlay(mapMusic());
  REG_DISPCNT = DCNT_MODE0 | DCNT_BG(0) | DCNT_BG(1) | DCNT_OBJ | DCNT_OBJ_1D;
  frame();
  if (REG_BLDCNT) fadeIn(10);                     // dopo una battaglia o un menu lo schermo è al buio
}
void worldWarp(int map, int x, int y){
  sfx(SFX_DOOR);
  fadeOut(12);
  oamHideAll();
  worldLoad(map, x, y, G.dir);
  frame();
  // cartello con il nome del luogo, come nei giochi GBA: sparisce da solo
  if (namePop) winClose(namePop);
  int w = (textWidth(curMap->name) + 16 + 7) / 8 + 2;
  namePop = winOpen(0, 0, w < 8 ? 8 : w, 3); winText(namePop, 6, 1, curMap->name, TC_TEXT); namePopT = 110;
  fadeIn(12);
  scriptEnterEvents();
}

// ---------- obiettivo: freccia verso la prossima tappa della trama (o l'uscita giusta) ----------
static int goalTarget(int *tx, int *ty){
  const Goal *g = 0;
  for (int i = 0; i < NUM_GOALS; i++) if (!flagGet(GOALS[i].flag)){ g = &GOALS[i]; break; }
  if (!g) return 0;
  if (g->map == G.map){ *tx = g->x; *ty = g->y; return 1; }
  // percorso minimo sul grafo dei portali: prima mappa verso la meta
  static u8 prev[64]; u8 q[64]; int qh = 0, qt = 0;
  for (int i = 0; i < 64; i++) prev[i] = 255;
  prev[G.map] = G.map; q[qt++] = G.map;
  while (qh < qt){
    int m = q[qh++]; if (m == g->map) break;
    for (int i = 0; i < MAPS[m].ntrig; i++){ const Trigger *t = &MAPS[m].trig[i]; if (t->type == T_PORTAL && prev[t->a] == 255){ prev[t->a] = m; q[qt++] = t->a; } }
  }
  if (prev[g->map] == 255) return 0;
  int step = g->map; while (prev[step] != G.map) step = prev[step];
  int best = 1 << 30;
  for (int i = 0; i < curMap->ntrig; i++){ const Trigger *t = &curMap->trig[i]; if (t->type == T_PORTAL && t->a == step){ int d = (t->x - G.x) * (t->x - G.x) + (t->y - G.y) * (t->y - G.y); if (d < best){ best = d; *tx = t->x; *ty = t->y; } } }
  return best < (1 << 30);
}
static void drawCompass(void){
  int tx, ty;
  if (!goalTarget(&tx, &ty)){ oamBuf[124].a0 = oamBuf[125].a0 = OBJ_HIDE; return; }
  int dx = tx - G.x, dy = ty - G.y;
  // otto direzioni: N, NE, E, SE, S, SO, O, NO
  int d;
  if (!dx && !dy){ oamSet(124, 6, 6, OBJ_SQUARE, OBJ_SIZE(0), 2 | OBJ_PAL(0)); oamBuf[125].a0 = OBJ_HIDE; return; }
  int adx = dx < 0 ? -dx : dx, ady = dy < 0 ? -dy : dy;
  if (adx * 5 < ady * 2) d = dy < 0 ? 0 : 4;
  else if (ady * 5 < adx * 2) d = dx > 0 ? 2 : 6;
  else d = dx > 0 ? (dy < 0 ? 1 : 3) : (dy < 0 ? 7 : 5);
  oamSet(124, 4, 4, OBJ_SQUARE, OBJ_SIZE(0), 2 | OBJ_PAL(0));
  oamSet(125, 13 + ((frameCount >> 4) & 1), 4, OBJ_SQUARE, OBJ_SIZE(0), (3 + d) | OBJ_PAL(0));
}

// ---------- movimento ----------
static const s8 DX[4] = { 0, 0, -1, 1 }, DY[4] = { 1, -1, 0, 0 };
static void stepFinished(void){
  G.x = player.px >> 4; G.y = player.py >> 4; G.steps++;
  const Trigger *t = triggerAt(G.x, G.y);
  if (t){
    if (t->type == T_PORTAL){
      if (t->need && sigilli() < t->need){
        say("", "Una barriera di luce sbarra la strada. Servono i Quattro Sigilli delle Ore.");
        // un passo indietro
        player.px -= DX[player.dir] * 16; player.py -= DY[player.dir] * 16; G.x = player.px >> 4; G.y = player.py >> 4;
        return;
      }
      worldWarp(t->a, t->b & 255, t->b >> 8);
      return;
    }
    if (t->type == T_DOOREV || t->type == T_EVENT || t->type == T_SHOP || t->type == T_INN || t->type == T_HEAL){ scriptTrigger(t); return; }
  }
#ifdef AUTOTEST
  extern volatile int testForceBattle;
  if (testForceBattle){ testForceBattle = 0; u8 m[2] = { MON_LUMACONE, MON_CORVO }; battleRun(m, 2, 0, 0); worldRedraw(); return; }
#endif
  // incontri casuali nell'erba alta
#ifdef AUTOTEST
  extern volatile int testNoEncounters;
  if (testNoEncounters) return;
#endif
  if (attrAt(G.x, G.y) & MA_GRASS){
    int z = curMap->zones ? curMap->zones[G.y * curMap->w + G.x] : curMap->zone;
    if (z != 255 && rndRange(256) < ZONES[z].rate){
      const Zone *zn = &ZONES[z];
      u8 mons[3]; int n = zn->min + rndRange(zn->max - zn->min + 1); if (n > 3) n = 3;
      for (int i = 0; i < n; i++) mons[i] = zn->mon[rndRange(zn->nmon)];
      battleRun(mons, n, 0, zn->backdrop);
      worldRedraw();
    }
  }
}
static void interact(void){
  int fx = G.x + DX[player.dir], fy = G.y + DY[player.dir];
  const Trigger *t = triggerAt(fx, fy);
  if (!t) return;
  for (int i = 0; i < nNpc; i++) if (npcs[i].t == t){ npcs[i].dir = player.dir == DIR_DOWN ? DIR_UP : player.dir == DIR_UP ? DIR_DOWN : player.dir == DIR_LEFT ? DIR_RIGHT : DIR_LEFT; npcs[i].frame = 0; }
  worldDrawActors(); frame();
  scriptTrigger(t);
  loadNpcs();                                  // un evento può far sparire qualcuno (es. chi si unisce al gruppo)
  worldDrawActors();
}

void worldRun(void){
  scriptEnterEvents();
  for (;;){
#ifdef AUTOTEST
    extern volatile int testWarpMap, testWarpX, testWarpY;
    if (testWarpMap >= 0 && !player.moving){ int m = testWarpMap; testWarpMap = -1; G.dir = DIR_UP; worldWarp(m, testWarpX, testWarpY); }
#endif
    if (!player.moving){
      if (keysHit & KEY_START){ sfx(SFX_OK); pauseMenu(); worldRedraw(); continue; }
      if (keysHit & KEY_A){ interact(); frame(); continue; }
      int dir = -1;
      if (keysHeld & KEY_DOWN) dir = DIR_DOWN; else if (keysHeld & KEY_UP) dir = DIR_UP;
      else if (keysHeld & KEY_LEFT) dir = DIR_LEFT; else if (keysHeld & KEY_RIGHT) dir = DIR_RIGHT;
      if (dir >= 0){
        player.dir = dir; G.dir = dir;
        int nx = G.x + DX[dir], ny = G.y + DY[dir];
        if (passable(nx, ny)){
          player.moving = 16;
          // il compagno prende il posto lasciato libero dal giocatore
          if (mate.px != player.px || mate.py != player.py){
            int mdx = player.px - mate.px, mdy = player.py - mate.py;
            mate.dir = mdx > 0 ? DIR_RIGHT : mdx < 0 ? DIR_LEFT : mdy > 0 ? DIR_DOWN : DIR_UP;
            mate.moving = 16;
          }
        } else {
          player.frame = 0;
          if (keysHit & (KEY_UP | KEY_DOWN | KEY_LEFT | KEY_RIGHT)) sfx(SFX_BUMP);
        }
      } else { player.frame = 0; mate.frame = 0; TEST_IDLE(); }
    }
    if (player.moving){
      int speed = (keysHeld & KEY_B) ? 2 : 1;       // B tenuto premuto: si corre
      if (player.moving < speed) speed = player.moving;
      player.px += DX[player.dir] * speed; player.py += DY[player.dir] * speed; player.moving -= speed;
      player.step += speed;
      player.frame = ((player.step >> 3) & 1) ? ((player.step >> 4) & 1 ? 2 : 1) : 0;
      if (mate.moving){
        int s = speed < mate.moving ? speed : mate.moving;
        mate.px += DX[mate.dir] * s; mate.py += DY[mate.dir] * s; mate.moving -= s;
        mate.frame = player.frame;
      }
      if (!player.moving){ mate.moving = 0; mate.px = (mate.px + 8) & ~15; mate.py = (mate.py + 8) & ~15; stepFinished(); }
    }
    updateCamera();
    worldDrawActors();
    if (namePopT && !--namePopT && namePop){ winClose(namePop); namePop = 0; }
    if (!namePopT) drawCompass();
    frame();
  }
}
