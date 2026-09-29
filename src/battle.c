// Battaglia a turni in stile GBA: mostri a sinistra, squadra a destra, comandi e stato in basso.
// Formula del danno, debolezze, critici e combo come nella versione web.
#include "battle.h"
#include "state.h"
#include "sys.h"
#include "text.h"
#include "script.h"
#include <string.h>

typedef struct {
  u8 ally, id, alive, status, defend, sleep;
  s16 hp, maxhp, mp, maxmp;
  Stats st;
  u8 atk10, def10, atkT, defT;     // potenziamenti (x10) e turni rimasti
  s16 x, y;                        // posizione dello sprite
  u8 hidden;
} Unit;
static Unit en[3], al[MAX_PARTY];
static int nen, nal, isBoss, fled;
static Win *panel;
static char line[120];
static void cat(char *d, const char *s){ while (*d) d++; while ((*d++ = *s++)); }
static void catn(char *d, int n){ char b[12]; cat(d, fmtNum(b, n)); }

#define EN_TILE(i) (64 + (i) * 64)
#define AL_TILE(i) (256 + (i) * 8)
#define DIGIT_TILE 320

// ---------- grafica ----------
static void loadHeroFrame(int k, int f){ memcpy16(OBJ_TILES + AL_TILE(k) * 16, LOOKS[CHARS[al[k].id].look].tiles + f * 128, 128); }
// cifre del danno: disegnate con il font in tile OBJ (bianco con bordo scuro)
static void buildDigits(void){
  u16 *base = OBJ_TILES + DIGIT_TILE * 16;
  memset16(base, 0, 11 * 16);
  for (int d = 0; d < 11; d++){
    u8 c = d < 10 ? '0' + d : '!';
    u8 px[8][8] = {{0}};
    for (int r = 0; r < 8; r++) for (int i = 0; i < FONT_W[c]; i++) if (FONT_ROWS[c][r] & (1 << i)) px[r][i + 1] = 4;
    for (int r = 0; r < 8; r++) for (int i = 0; i < 8; i++) if (!px[r][i]){
      int edge = 0;
      for (int k = 0; k < 4; k++){ int rr = r + (k == 0) - (k == 1), ii = i + (k == 2) - (k == 3); if (rr >= 0 && rr < 8 && ii >= 0 && ii < 8 && px[rr][ii] == 4) edge = 1; }
      if (edge) px[r][i] = 1;
    }
    for (int r = 0; r < 8; r++) for (int i = 0; i < 8; i += 4) base[d * 16 + r * 2 + i / 4] = px[r][i] | (px[r][i + 1] << 4) | (px[r][i + 2] << 8) | (px[r][i + 3] << 12);
  }
}
static void drawUnits(void){
  for (int i = 0; i < 3; i++){
    if (i >= nen || !en[i].alive || en[i].hidden){ oamBuf[i].a0 = OBJ_HIDE; continue; }
    oamSet(i, en[i].x, en[i].y, OBJ_SQUARE, OBJ_SIZE(3), EN_TILE(i) | OBJ_PAL(1 + i) | OBJ_PRIO(1));
  }
  for (int k = 0; k < MAX_PARTY; k++){
    if (k >= nal || al[k].hidden){ oamBuf[4 + k].a0 = OBJ_HIDE; continue; }
    // sprite 16x32 raddoppiato con la matrice affine 0 (KO: steso di lato con la matrice 1)
    oamSet(4 + k, al[k].x, al[k].y, OBJ_TALL | OBJ_DOUBLE, OBJ_SIZE(2) | ((al[k].alive ? 0 : 1) << 9), AL_TILE(k) | OBJ_PAL(4 + k) | OBJ_PRIO(1));
  }
}
static void popNumber(int x, int y, int n, int heal){
  char b[12]; fmtNum(b, n);
  int len = strlen(b);
  for (int t = 0; t < 36; t++){
    int dy = t < 10 ? -t : -10 + (t > 30 ? (t - 30) : 0);
    for (int i = 0; i < 8; i++){
      if (i < len) oamSet(20 + i, x + i * 6 - len * 3, y + dy, OBJ_SQUARE, OBJ_SIZE(0), (DIGIT_TILE + b[i] - '0') | OBJ_PAL(heal ? 8 : 0));
      else oamBuf[20 + i].a0 = OBJ_HIDE;
    }
    drawUnits(); frame();
  }
  for (int i = 0; i < 8; i++) oamBuf[20 + i].a0 = OBJ_HIDE;
}
static void shakeScreen(int f){ for (int i = 0; i < f; i++){ setScroll(1, (i & 1) ? 2 : -2, 0); drawUnits(); frame(); } setScroll(1, 0, 0); }
static void blinkUnit(Unit *u, int times){ for (int i = 0; i < times * 2; i++){ u->hidden = i & 1; drawUnits(); frame(); frame(); } u->hidden = 0; }
static void flashScreen(int color){
  // lampo: schiarisce tutto per qualche fotogramma
  (void)color;
  for (int i = 8; i >= 0; i -= 2){ REG_BLDCNT = 0x3F | (2 << 6); setBldy(i); drawUnits(); frame(); }
  REG_BLDCNT = 0;
}

// ---------- pannello di stato ----------
static void drawPanel(int active){
  winClear(panel);
  for (int k = 0; k < nal; k++){
    Unit *u = &al[k]; int y = 2 + k * 11;
    winText(panel, 4, y, CHARS[u->id].name, k == active ? TC_BLUE : u->alive ? TC_TEXT : TC_RED);
    int w = u->maxhp ? 34 * u->hp / u->maxhp : 0;
    winRect(panel, 40, y + 3, 36, 5, TC_GRAY);
    winRect(panel, 41, y + 4, w, 3, u->hp * 5 < u->maxhp ? TC_RED : u->hp * 2 < u->maxhp ? TC_GOLD : TC_GREEN);
    winNum(panel, 100, y, u->hp, TC_TEXT, 1);
    winText(panel, 104, y, "MP", TC_GRAY);
    winNum(panel, 134, y, u->mp, TC_BLUE, 1);
    if (u->status == 1) winText(panel, 4, y, "*", TC_PURPLE);
    if (u->status == 2) winText(panel, 4, y, "z", TC_BLUE);
  }
}

// ---------- danni ----------
static int elemMult100(const Unit *t, int el){
  if (t->ally) return 100;
  const Monster *m = &MONSTERS[t->id];
  if (m->weak & (1 << el)) return 150;
  if (m->resist & (1 << el)) return 50;
  return 100;
}
static int damage(Unit *u, Unit *t, int type, int power, int el, int critPct, int *crit){
  int v = 90 + rndRange(21);                        // variazione ±10%
  int em = elemMult100(t, el);
  int atk = (type == AB_PHYS ? u->st.atk : u->st.mag) * u->atk10 / 10;
  int def = type == AB_PHYS ? t->st.def * t->def10 / 10 : t->st.spr;
  int base = atk * 220 + power * 180;               // x100
  int dmg;
  *crit = 0;
  if (type == AB_PHYS){ *crit = rndRange(100) < (critPct ? critPct : 6); dmg = base * v / 100 * em / 100 * (*crit ? 18 : 10) / 10 - def * 140; }
  else dmg = base * v / 100 * em / 100 - def * 120;
  dmg = dmg * (u->ally ? 145 : 55) / 100 / 100;
  if (t->defend) dmg /= 2;
  return dmg < 1 ? 1 : dmg;
}
static void hurt(Unit *t, int dmg, int crit){
  t->hp -= dmg; if (t->hp < 0) t->hp = 0;
  sfx(crit ? SFX_CRIT : SFX_HIT);
  if (!t->ally) blinkUnit(t, 2); else shakeScreen(8);
  popNumber(t->x + (t->ally ? 16 : 32), t->y + (t->ally ? 20 : 20), dmg, 0);
  if (t->hp == 0){
    t->alive = 0;
    if (!t->ally){ sfx(SFX_HIT); blinkUnit(t, 4); t->hidden = 1; }
    else { loadHeroFrame(t - al, 6); }
  }
  if (t->sleep && t->hp > 0){ t->sleep = 0; t->status = 0; }
  drawPanel(-1);
}
static void healUnit(Unit *t, int amount){
  t->hp += amount; if (t->hp > t->maxhp) t->hp = t->maxhp;
  sfx(SFX_HEAL);
  popNumber(t->x + 16, t->y + 20, amount, 1);
  drawPanel(-1);
}
static int aliveCount(Unit *u, int n){ int c = 0; for (int i = 0; i < n; i++) c += u[i].alive; return c; }

// ---------- scelta dei bersagli ----------
static int chooseEnemy(void){
  int sel = 0; while (sel < nen && !en[sel].alive) sel++;
  for (;;){
    cursorAt(en[sel].x + 24, en[sel].y + 8 + ((frameCount >> 3) & 1));
    TEST_WAITING();
    drawUnits(); frame();
    if (keysRep & (KEY_RIGHT | KEY_DOWN)){ do sel = (sel + 1) % nen; while (!en[sel].alive); sfx(SFX_CURSOR); }
    if (keysRep & (KEY_LEFT | KEY_UP)){ do sel = (sel + nen - 1) % nen; while (!en[sel].alive); sfx(SFX_CURSOR); }
    if (keysHit & KEY_A){ sfx(SFX_OK); cursorHide(); return sel; }
    if (keysHit & KEY_B){ sfx(SFX_CANCEL); cursorHide(); return -1; }
  }
}
static int chooseAlly(int allowDead){
  int sel = 0;
  for (;;){
    cursorAt(al[sel].x + 2, al[sel].y + 20 + ((frameCount >> 3) & 1));
    TEST_WAITING();
    drawUnits(); frame();
    if (keysRep & (KEY_DOWN | KEY_RIGHT)){ sel = (sel + 1) % nal; sfx(SFX_CURSOR); }
    if (keysRep & (KEY_UP | KEY_LEFT)){ sel = (sel + nal - 1) % nal; sfx(SFX_CURSOR); }
    if (keysHit & KEY_A){ if (!al[sel].alive && !allowDead){ sfx(SFX_CANCEL); continue; } sfx(SFX_OK); cursorHide(); return sel; }
    if (keysHit & KEY_B){ sfx(SFX_CANCEL); cursorHide(); return -1; }
  }
}

// ---------- azioni ----------
typedef struct { u8 kind, who, ab, target, item; s8 speed; } Action;   // kind: 1 attacco/abilità, 2 combo, 3 oggetto, 4 difesa, 5 fuga
static Action acts[8]; static int nacts;
static void heroStep(int k, int fwd){ loadHeroFrame(k, fwd ? 7 : 6); for (int i = 0; i < 8; i++){ al[k].x += fwd ? -2 : 2; drawUnits(); frame(); } loadHeroFrame(k, 6); }
static void useAbility(Unit *u, const Ability *a, int tgt){
  line[0] = 0; cat(line, CHARS[u->id].name); cat(line, ": "); cat(line, a->name); msgShow(line);
  int k = u - al;
  if (a->type == AB_PHYS || a->type == AB_MAG){
    if (a->type == AB_PHYS) heroStep(k, 1); else { sfx(SFX_MAGIC); flashScreen(0); }
    for (int i = 0; i < nen; i++){
      Unit *t = a->target == TG_ENEMIES ? &en[i] : &en[tgt];
      if (a->target != TG_ENEMIES && i) break;
      if (!t->alive){ if (a->target == TG_ENEMIES) continue; for (int j = 0; j < nen; j++) if (en[j].alive){ t = &en[j]; break; } if (!t->alive) break; }
      int total = 0, anyCrit = 0;
      for (int h = 0; h < (a->hits ? a->hits : 1); h++){ int c; total += damage(u, t, a->type, a->power, a->element, a->crit, &c); anyCrit |= c; }
      hurt(t, total, anyCrit);
      if (a->status && t->alive && rndRange(100) < a->chance){ t->status = a->status; if (a->status == 2) t->sleep = 3; }
    }
    if (a->type == AB_PHYS) heroStep(k, 0);
  } else if (a->type == AB_HEAL || a->type == AB_HEALALL){
    sfx(SFX_HEAL); flashScreen(0);
    for (int i = 0; i < nal; i++){
      Unit *t = a->type == AB_HEALALL ? &al[i] : &al[tgt];
      if (a->type != AB_HEALALL && i) break;
      if (!t->alive) continue;
      healUnit(t, a->power + u->st.mag * 3 / 2);
    }
  } else if (a->type == AB_REVIVE){
    Unit *t = &al[tgt];
    if (!t->alive){ t->alive = 1; t->hp = t->maxhp / 2; loadHeroFrame(tgt, 6); healUnit(t, 0); }
  } else if (a->type == AB_BUFF){
    sfx(SFX_MAGIC);
    for (int i = 0; i < nal; i++){ Unit *t = a->target == TG_ALLIES ? &al[i] : a->target == TG_SELF ? u : &al[tgt]; if (a->bstat == 2){ t->def10 = a->bmult10; t->defT = a->bturns; } else { t->atk10 = a->bmult10; t->atkT = a->bturns; } if (a->target != TG_ALLIES) break; }
    msgShow("Il potere della squadra cresce!"); for (int i = 0; i < 40; i++){ drawUnits(); frame(); }
  } else if (a->type == AB_STATUS){
    sfx(SFX_MAGIC);
    for (int i = 0; i < nen; i++){ Unit *t = a->target == TG_ENEMIES ? &en[i] : &en[tgt]; if (t->alive && rndRange(100) < (a->chance ? a->chance : 60)){ t->status = a->status; if (a->status == 2) t->sleep = 3; blinkUnit(t, 1); } if (a->target != TG_ENEMIES) break; }
  } else if (a->type == AB_STEAL){
    heroStep(k, 1);
    int it = rndRange(3) ? IT_POZIONE : IT_ETERE; addItem(it, 1);
    line[0] = 0; cat(line, "Rubato: "); cat(line, ITEMS[it].name); cat(line, "!"); msgShow(line); for (int i = 0; i < 40; i++){ drawUnits(); frame(); }
    heroStep(k, 0);
  }
}
static void doCombo(int c, int tgt){
  const Combo *cb = &COMBOS[c];
  Unit *ste = 0, *riki = 0;
  for (int i = 0; i < nal; i++){ if (al[i].id == CH_STE) ste = &al[i]; if (al[i].id == CH_RIKI) riki = &al[i]; }
  if (!ste || !riki || !ste->alive || !riki->alive || ste->mp < cb->mpSte || riki->mp < cb->mpRiki){ msgShow("La combo non riesce..."); for (int i = 0; i < 40; i++) frame(); return; }
  ste->mp -= cb->mpSte; riki->mp -= cb->mpRiki;
  line[0] = 0; cat(line, "COMBO! "); cat(line, cb->name); msgShow(line);
  sfx(SFX_MAGIC); flashScreen(0); flashScreen(0);
  heroStep(riki - al, 1);
  for (int i = 0; i < nen; i++){
    Unit *t = cb->target == TG_ENEMIES ? &en[i] : &en[tgt];
    if (cb->target != TG_ENEMIES && i) break;
    if (!t->alive) continue;
    int total = 0, c1, c2;
    for (int h = 0; h < cb->hits; h++) total += damage(ste, t, AB_MAG, cb->power * 6 / 10, cb->element, 0, &c1) + damage(riki, t, AB_PHYS, cb->power * 6 / 10, cb->element, cb->crit, &c2);
    hurt(t, total, c2);
  }
  heroStep(riki - al, 0);
}
static void useItem(Unit *u, int it, int tgt){
  const Item *I = &ITEMS[it];
  line[0] = 0; cat(line, CHARS[u->id].name); cat(line, " usa "); cat(line, I->name); msgShow(line);
  addItem(it, -1);
  Unit *t = &al[tgt];
  switch (I->type){
    case IT_HEAL: if (t->alive) healUnit(t, I->power); break;
    case IT_FULL: if (t->alive){ t->mp = t->maxmp; healUnit(t, t->maxhp); } break;
    case IT_MP: if (t->alive){ t->mp += I->power; if (t->mp > t->maxmp) t->mp = t->maxmp; sfx(SFX_HEAL); drawPanel(-1); for (int i = 0; i < 30; i++) frame(); } break;
    case IT_REVIVE: if (!t->alive){ t->alive = 1; t->hp = t->maxhp / 2; loadHeroFrame(tgt, 6); healUnit(t, 0); } break;
    case IT_CURE: t->status = 0; t->sleep = 0; sfx(SFX_HEAL); drawPanel(-1); for (int i = 0; i < 30; i++) frame(); break;
  }
}
static void enemyTurn(Unit *e){
  const Monster *m = &MONSTERS[e->id];
  int tw = 0; for (int i = 0; i < m->nmoves; i++) tw += m->moves[i].w;
  int r = rndRange(tw), mi = 0; while (mi < m->nmoves - 1 && r >= m->moves[mi].w){ r -= m->moves[mi].w; mi++; }
  const Move *mv = &m->moves[mi];
  line[0] = 0; cat(line, m->name); cat(line, ": "); cat(line, mv->name); msgShow(line);
  for (int i = 0; i < 3; i++){ e->x += 3; drawUnits(); frame(); } for (int i = 0; i < 3; i++){ e->x -= 3; drawUnits(); frame(); }
  if (mv->type == AB_HEAL){ healUnit(e, mv->power + e->st.mag); return; }
  if (mv->type == AB_BUFF){ e->atk10 = 15; e->atkT = 3; msgShow("Il nemico si fa più minaccioso!"); for (int i = 0; i < 30; i++) frame(); return; }
  if (mv->type == AB_MAG){ sfx(SFX_MAGIC); flashScreen(0); }
  for (int k = 0; k < nal; k++){
    Unit *t = 0;
    if (mv->target == TG_ENEMIES) t = &al[k];
    else { if (k) break; int c = aliveCount(al, nal), p = rndRange(c); for (int j = 0; j < nal; j++) if (al[j].alive && !p--){ t = &al[j]; break; } }
    if (!t || !t->alive) continue;
    int crit, dmg = damage(e, t, mv->type == AB_MAG ? AB_MAG : AB_PHYS, mv->power, mv->element, 0, &crit);
    hurt(t, dmg, crit);
    if (mv->status && t->alive && rndRange(100) < mv->chance){ t->status = mv->status; if (mv->status == 2) t->sleep = 2; }
  }
}

// ---------- menu dei comandi ----------
static int heroCommand(int k, Action *a){
  Unit *u = &al[k];
  for (;;){
    drawPanel(k);
    const char *opts[7]; int code[7], n = 0;
    opts[n] = "Attacca"; code[n++] = 0;
    opts[n] = "Abilità"; code[n++] = 1;
    int duo = (u->id == CH_STE || u->id == CH_RIKI);
    for (int i = 0; i < nal; i++) if ((al[i].id == CH_STE || al[i].id == CH_RIKI) && al[i].id != u->id && !al[i].alive) duo = 0;
    if (duo){ opts[n] = "Combo"; code[n++] = 2; }
    if (CHARS[u->id].limit != 255 && u->hp * 10 < u->maxhp * 3){ opts[n] = "LIMITE!"; code[n++] = 6; }
    opts[n] = "Oggetti"; code[n++] = 3;
    opts[n] = "Difendi"; code[n++] = 4;
    if (!isBoss){ opts[n] = "Fuggi"; code[n++] = 5; }
    int c = menuChoose(0, 20 - ((n * 12 + 4 + 7) / 8 + 2), 10, opts, n, 0, k > 0);
    if (c < 0) return -1;
    switch (code[c]){
      case 0: { int t = chooseEnemy(); if (t < 0) continue; *a = (Action){ 1, k, AB_ATTACCO, t, 0, 0 }; return 0; }
      case 1: {
        u8 abs[24]; int na = abilityList(u->id, abs);
        const char *names[24]; static char nb[24][32];
        for (int i = 0; i < na; i++){ nb[i][0] = 0; cat(nb[i], ABILITIES[abs[i]].name); cat(nb[i], " "); catn(nb[i], ABILITIES[abs[i]].mp); names[i] = nb[i]; }
        if (!na){ msgShow("Nessuna abilità."); for (int i = 0; i < 30; i++) frame(); msgClose(); continue; }
        int s = menuChoose(10, 0, 20, names, na > 8 ? 8 : na, 0, 1);
        if (s < 0) continue;
        const Ability *ab = &ABILITIES[abs[s]];
        if (u->mp < ab->mp){ sfx(SFX_CANCEL); msgShow("MP insufficienti!"); for (int i = 0; i < 30; i++) frame(); msgClose(); continue; }
        int t = 0;
        if (ab->target == TG_ENEMY){ t = chooseEnemy(); if (t < 0) continue; }
        else if (ab->target == TG_ALLY){ t = chooseAlly(ab->type == AB_REVIVE); if (t < 0) continue; }
        *a = (Action){ 1, k, abs[s], t, 0, 0 }; return 0;
      }
      case 6: { const Ability *ab = &ABILITIES[CHARS[u->id].limit]; int t = 0; if (ab->target == TG_ENEMY){ t = chooseEnemy(); if (t < 0) continue; } *a = (Action){ 1, k, CHARS[u->id].limit, t, 0, 0 }; return 0; }
      case 2: {
        const char *names[8]; static char nb[8][32]; int ids[8], nc = 0;
        for (int i = 0; i < NUM_COMBOS; i++) if (G.ch[CH_STE].level >= COMBOS[i].lv){ nb[nc][0] = 0; cat(nb[nc], COMBOS[i].name); names[nc] = nb[nc]; ids[nc++] = i; }
        int s = menuChoose(10, 0, 20, names, nc, 0, 1);
        if (s < 0) continue;
        int t = 0; if (COMBOS[ids[s]].target == TG_ENEMY){ t = chooseEnemy(); if (t < 0) continue; }
        *a = (Action){ 2, k, ids[s], t, 0, 0 }; return 0;
      }
      case 3: {
        const char *names[16]; static char nb[16][32]; int ids[16], ni = 0;
        for (int i = 0; i < NUM_ITEMS && ni < 16; i++) if (G.inv[i] && ITEMS[i].type <= IT_CURE){ nb[ni][0] = 0; cat(nb[ni], ITEMS[i].name); cat(nb[ni], " x"); catn(nb[ni], G.inv[i]); names[ni] = nb[ni]; ids[ni++] = i; }
        if (!ni){ msgShow("Nessun oggetto utilizzabile."); for (int i = 0; i < 30; i++) frame(); msgClose(); continue; }
        int s = menuChoose(10, 0, 20, names, ni > 8 ? 8 : ni, 0, 1);
        if (s < 0) continue;
        int t = chooseAlly(ITEMS[ids[s]].type == IT_REVIVE); if (t < 0) continue;
        *a = (Action){ 3, k, 0, t, ids[s], 0 }; return 0;
      }
      case 4: *a = (Action){ 4, k, 0, 0, 0, 0 }; return 0;
      case 5: *a = (Action){ 5, k, 0, 0, 0, 0 }; return 0;
    }
  }
}

static void wait(int f){ for (int i = 0; i < f; i++){ drawUnits(); frame(); } }

int battleRun(const u8 *mons, int n, int boss, int backdrop){
  isBoss = boss; fled = 0;
  frameHook = 0;
  sfx(SFX_ENC);
  // transizione: lampeggio e dissolvenza
  for (int i = 0; i < 3; i++){ setBrightness(-16); frame(); frame(); setBrightness(0); frame(); frame(); }
  fadeOut(10);
  oamHideAll(); winCloseAll();
  const Backdrop *bd = &BACKDROPS[backdrop];
  memcpy16(CHARBLOCK(1), bd->tiles, bd->ntiles * 16);
  for (int i = 0; i < 16; i++) MEM_PAL_BG[8 * 16 + i] = bd->pal[i];
  u16 *sb = SCREENBLOCK(28);
  for (int i = 0; i < 32 * 20; i++) sb[i] = bd->map[i] | (8 << 12);
  setScroll(1, 0, 0);
  // nemici
  nen = n;
  static const s16 EX[3][3] = { { 40, 0, 0 }, { 12, 72, 0 }, { 0, 50, 100 } };
  for (int i = 0; i < n; i++){
    const Monster *m = &MONSTERS[mons[i]];
    en[i] = (Unit){ 0, mons[i], 1, 0, 0, 0, m->hp, m->hp, 99, 99, { m->hp, 99, m->atk, m->def, m->mag, m->spr, m->spd }, 10, 10, 0, 0, EX[n - 1][i], boss ? 4 : 12, 0 };
    memcpy16(OBJ_TILES + EN_TILE(i) * 16, m->gfx, 64 * 16);
    for (int c = 0; c < 16; c++) MEM_PAL_OBJ[(1 + i) * 16 + c] = m->pal[c];
  }
  // squadra
  nal = G.nparty;
  for (int k = 0; k < nal; k++){
    int id = G.party[k]; Stats s = statsOf(id);
    al[k] = (Unit){ 1, id, G.ch[id].hp > 0, G.ch[id].status, 0, 0, G.ch[id].hp, s.hp, G.ch[id].mp, s.mp, s, 10, 10, 0, 0, 140 + k * 23, 18 + k * 6, 0 };
    loadHeroFrame(k, 6);
    for (int c = 0; c < 16; c++) MEM_PAL_OBJ[(4 + k) * 16 + c] = LOOKS[CHARS[id].look].pal[c];
  }
  // matrici affini: 0 = doppia grandezza, 1 = doppia e ruotata (KO)
  setAffine(0, 0x80, 0, 0, 0x80);
  setAffine(1, 0, 0x80, -0x80, 0);
  // tavolozza 8 degli sprite: cifre verdi per le cure
  for (int c = 0; c < 16; c++) MEM_PAL_OBJ[8 * 16 + c] = OBJ_UI_PAL[c];
  MEM_PAL_OBJ[8 * 16 + 4] = RGB15(12, 31, 12);
  buildDigits();
  textInit();
  panel = winOpen(10, 12, 20, 8);
  drawPanel(-1);
  REG_DISPCNT = DCNT_MODE0 | DCNT_BG(0) | DCNT_BG(1) | DCNT_OBJ | DCNT_OBJ_1D;
  musicPlay(boss ? MUS_BOSS : MUS_BATTLE);
  drawUnits(); frame();
  fadeIn(10);
  line[0] = 0;
  if (n == 1){ cat(line, MONSTERS[mons[0]].name); cat(line, boss ? " sbarra la strada!" : " attacca!"); }
  else cat(line, "Arrivano dei nemici!");
  msgShow(line); wait(50); msgClose();

  int result = -1;
  while (result < 0){
    // 1) comandi della squadra
    nacts = 0;
    for (int k = 0; k < nal; k++){
      Unit *u = &al[k];
      u->defend = 0;
      if (!u->alive) continue;
      if (u->sleep){ continue; }
      // la combo usa anche il turno del compagno
      int taken = 0; for (int i = 0; i < nacts; i++) if (acts[i].kind == 2 && (al[acts[i].who].id == CH_STE || al[acts[i].who].id == CH_RIKI) && (u->id == CH_STE || u->id == CH_RIKI)) taken = 1;
      if (taken) continue;
      Action a;
      if (heroCommand(k, &a) < 0){ if (k > 0){ k -= 2; if (nacts) nacts--; if (k < -1) k = -1; } continue; }
      a.speed = u->st.spd + rndRange(5);
      if (a.kind == 4){ u->defend = 1; continue; }
      acts[nacts++] = a;
    }
    drawPanel(-1);
    // 2) nemici e ordine per velocità
    int order[12], no = 0, spd[12];
    for (int i = 0; i < nacts; i++){ order[no] = i; spd[no++] = acts[i].speed; }
    for (int i = 0; i < nen; i++) if (en[i].alive){ order[no] = 100 + i; spd[no++] = en[i].st.spd + rndRange(5); }
    for (int i = 1; i < no; i++) for (int j = i; j > 0 && spd[j] > spd[j - 1]; j--){ int t = order[j]; order[j] = order[j - 1]; order[j - 1] = t; t = spd[j]; spd[j] = spd[j - 1]; spd[j - 1] = t; }
    // 3) esecuzione
    for (int o = 0; o < no && result < 0; o++){
      if (order[o] >= 100){
        Unit *e = &en[order[o] - 100];
        if (!e->alive) continue;
        if (e->sleep){ e->sleep--; if (!e->sleep) e->status = 0; line[0] = 0; cat(line, MONSTERS[e->id].name); cat(line, " dorme..."); msgShow(line); wait(30); continue; }
        enemyTurn(e);
      } else {
        Action *a = &acts[order[o]]; Unit *u = &al[a->who];
        if (!u->alive) continue;
        if (a->kind == 1){
          const Ability *ab = &ABILITIES[a->ab];
          if (u->mp < ab->mp) continue;
          u->mp -= ab->mp;
          useAbility(u, ab, a->target);
        } else if (a->kind == 2) doCombo(a->ab, a->target);
        else if (a->kind == 3) useItem(u, a->item, a->target);
        else if (a->kind == 5){
          if (rndRange(100) < 65){ msgShow("La squadra se la dà a gambe!"); wait(40); result = 2; }
          else { msgShow("Non si riesce a fuggire!"); wait(40); }
        }
        drawPanel(-1);
      }
      if (!aliveCount(en, nen)) result = 1;
      else if (!aliveCount(al, nal)) result = 0;
    }
    msgClose();
    // 4) fine turno: veleno, sonno, potenziamenti
    for (int k = 0; k < nal && result < 0; k++){
      Unit *u = &al[k];
      if (u->alive && u->status == 1){ int d = u->maxhp / 12 + 1; line[0] = 0; cat(line, CHARS[u->id].name); cat(line, " soffre per il veleno!"); msgShow(line); hurt(u, d, 0); msgClose(); }
      if (u->sleep && --u->sleep == 0) u->status = 0;
      if (u->atkT && --u->atkT == 0) u->atk10 = 10;
      if (u->defT && --u->defT == 0) u->def10 = 10;
    }
    for (int i = 0; i < nen && result < 0; i++) if (en[i].alive && en[i].status == 1) hurt(&en[i], en[i].maxhp / 12 + 1, 0);
    if (result < 0 && !aliveCount(en, nen)) result = 1;
    if (result < 0 && !aliveCount(al, nal)) result = 0;
  }

  // ritorno dei valori alla squadra
  for (int k = 0; k < nal; k++){ Member *m = &G.ch[al[k].id]; m->hp = al[k].hp; m->mp = al[k].mp; m->status = al[k].status == 1 ? 1 : 0; if (!al[k].alive) m->hp = 0; }
  if (result == 1){
    musicPlay(MUS_VICTORY);
    int exp = 0, gold = 0;
    for (int i = 0; i < nen; i++){ exp += MONSTERS[en[i].id].exp; gold += MONSTERS[en[i].id].gold; registerKill(en[i].id); }
    G.gold += gold;
    // emozione della vittoria: salto dei vincitori
    for (int t = 0; t < 40; t++){ for (int k = 0; k < nal; k++) if (al[k].alive){ al[k].y = 18 + k * 6 - ((t + k * 5) % 20 < 10 ? (t + k * 5) % 10 : 10 - (t + k * 5) % 10); loadHeroFrame(k, ((t >> 2) & 1) ? 0 : 6); } drawUnits(); frame(); }
    for (int k = 0; k < nal; k++){ al[k].y = 18 + k * 6; loadHeroFrame(k, 6); }
    line[0] = 0; cat(line, "Vittoria! "); catn(line, exp); cat(line, " EXP e "); catn(line, gold); cat(line, " oro.");
    say("", line);
    for (int k = 0; k < nal; k++){
      if (!al[k].alive) continue;
      int id = al[k].id; u8 learned[8]; int nl = 0;
      int lv = gainExp(id, exp, learned, &nl);
      if (lv){ sfx(SFX_LEVEL); line[0] = 0; cat(line, CHARS[id].name); cat(line, " sale al livello "); catn(line, G.ch[id].level); cat(line, "!"); say("", line); }
      for (int i = 0; i < nl; i++){ line[0] = 0; cat(line, CHARS[id].name); cat(line, " impara "); cat(line, ABILITIES[learned[i]].name); cat(line, "!"); say("", line); }
    }
    // chi è KO si rialza con 1 HP, come nella versione web
    for (int k = 0; k < nal; k++) if (G.ch[al[k].id].hp <= 0) G.ch[al[k].id].hp = 1;
  }
  if (result == 2) for (int k = 0; k < nal; k++) if (G.ch[al[k].id].hp <= 0) G.ch[al[k].id].hp = 1;
  fadeOut(12);                                   // resta al buio: la mappa rientra con worldRedraw + fadeIn
  winCloseAll(); oamHideAll(); cursorHide();
  frame();
  return result;
}
