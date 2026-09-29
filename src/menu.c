// Menu di pausa: squadra, oggetti, equipaggiamento, missioni, salvataggio.
#include "menu.h"
#include "state.h"
#include "sys.h"
#include "text.h"
#include "world.h"
#include <string.h>

static void cat(char *d, const char *s){ while (*d) d++; while ((*d++ = *s++)); }
static void catn(char *d, int n){ char b[12]; cat(d, fmtNum(b, n)); }
static int waitAB(void){ for (;;){ frame(); if (keysHit & KEY_A) return 1; if (keysHit & KEY_B) return 0; } }

// scelta di un membro della squadra (tutti quelli arrivati): -1 annullato
static int pickMember(const char *title, int onlyAlive){
  const char *names[8]; static char nb[8][40]; int ids[8], n = 0;
  for (int i = 0; i < 8; i++) if (G.joined & (1 << i)){
    Stats s = statsOf(i); nb[n][0] = 0; cat(nb[n], CHARS[i].name); cat(nb[n], "  HP "); catn(nb[n], G.ch[i].hp); cat(nb[n], "/"); catn(nb[n], s.hp);
    names[n] = nb[n]; ids[n++] = i;
  }
  (void)onlyAlive;
  Win *t = winOpen(0, 0, 30, 3); winText(t, 4, 0, title, TC_BLUE);
  int c = menuChoose(4, 3, 22, names, n, 0, 1);
  winClose(t);
  return c < 0 ? -1 : ids[c];
}

static void showMember(int id){
  Stats s = statsOf(id); const Member *m = &G.ch[id];
  Win *w = winOpen(0, 0, 30, 20);
  char b[40];
  b[0] = 0; cat(b, CHARS[id].name); cat(b, " - "); cat(b, CHARS[id].cls); winText(w, 4, 2, b, TC_BLUE);
  b[0] = 0; cat(b, "Livello "); catn(b, m->level); winText(w, 150, 2, b, TC_TEXT);
  b[0] = 0; cat(b, "EXP "); catn(b, m->exp); cat(b, " / "); catn(b, expToNext(m->level)); winText(w, 4, 14, b, TC_GRAY);
  static const char *const L[] = { "HP", "MP", "Attacco", "Difesa", "Magia", "Spirito", "Velocità" };
  int v[7] = { m->hp, m->mp, s.atk, s.def, s.mag, s.spr, s.spd };
  for (int i = 0; i < 7; i++){
    winText(w, 4, 30 + i * 11, L[i], TC_TEXT);
    b[0] = 0; catn(b, v[i]); if (i < 2){ cat(b, " / "); catn(b, i ? s.mp : s.hp); }
    winText(w, 60, 30 + i * 11, b, TC_TEXT);
  }
  static const char *const SL[] = { "Arma", "Abito", "Accessorio" };
  for (int k = 0; k < 3; k++){ winText(w, 124, 30 + k * 11, SL[k], TC_GRAY); winText(w, 124, 41 + k * 22, m->eq[k] == 255 ? "-" : ITEMS[m->eq[k]].name, TC_TEXT); }
  u8 abs[24]; int na = abilityList(id, abs);
  winText(w, 4, 110, "Abilità:", TC_GRAY);
  int x = 50, y = 110;
  for (int i = 0; i < na; i++){ int tw = textWidth(ABILITIES[abs[i]].name) + 6; if (x + tw > 224){ x = 4; y += 11; if (y > 130) break; } winText(w, x, y, ABILITIES[abs[i]].name, TC_TEXT); x += tw; }
  waitAB();
  winClose(w);
}

static void teamMenu(void){
  static const char *const OPTS[] = { "Stato", "Chi combatte", "Indietro" };
  for (;;){
    int c = menuChoose(8, 4, 14, OPTS, 3, 0, 1);
    if (c < 0 || c == 2) return;
    if (c == 0){ int id = pickMember("Di chi vuoi vedere lo stato?", 0); if (id >= 0) showMember(id); continue; }
    // chi combatte: Ste e Riki restano sempre, gli altri due posti si scelgono
    int id = pickMember("Chi entra in squadra? (max 4, Ste e Riki fissi)", 0);
    if (id < 0 || id == CH_STE || id == CH_RIKI) continue;
    int in = -1; for (int k = 0; k < G.nparty; k++) if (G.party[k] == id) in = k;
    if (in >= 0){ for (int k = in; k < G.nparty - 1; k++) G.party[k] = G.party[k + 1]; G.nparty--; say("", "Esce dalla squadra: resta ad aspettare."); }
    else if (G.nparty < MAX_PARTY){ G.party[G.nparty++] = id; say("", "Entra in squadra!"); }
    else { G.party[MAX_PARTY - 1] = id; say("", "Prende il posto dell'ultimo della fila."); }
  }
}

static void itemsMenu(void){
  for (;;){
    const char *names[24]; static char nb[24][40]; int ids[24], n = 0;
    for (int i = 0; i < NUM_ITEMS && n < 24; i++) if (G.inv[i] && ITEMS[i].type != IT_EQUIP){ nb[n][0] = 0; cat(nb[n], ITEMS[i].name); cat(nb[n], " x"); catn(nb[n], G.inv[i]); names[n] = nb[n]; ids[n++] = i; }
    if (!n){ say("", "Lo zaino è vuoto."); return; }
    int c = menuChoose(6, 1, 22, names, n > 11 ? 11 : n, 0, 1);
    if (c < 0) return;
    const Item *it = &ITEMS[ids[c]];
    say("", it->desc);
    if (it->type == IT_QUEST || it->type == IT_KEY) continue;
    int id = pickMember("Su chi?", 0);
    if (id < 0) continue;
    Stats s = statsOf(id); Member *m = &G.ch[id];
    if (it->type == IT_TOME){
      if (it->who != 255 && !(it->who & (1 << id))){ say("", "Non è il suo campo di studi."); continue; }
      m->tomes[it->ab >> 5] |= 1u << (it->ab & 31); addItem(ids[c], -1); sfx(SFX_LEVEL);
      char b[60]; b[0] = 0; cat(b, CHARS[id].name); cat(b, " impara "); cat(b, ABILITIES[it->ab].name); cat(b, "!"); say("", b); continue;
    }
    switch (it->type){
      case IT_HEAL: m->hp += it->power; if (m->hp > s.hp) m->hp = s.hp; break;
      case IT_FULL: m->hp = s.hp; m->mp = s.mp; break;
      case IT_MP: m->mp += it->power; if (m->mp > s.mp) m->mp = s.mp; break;
      case IT_REVIVE: if (m->hp <= 0) m->hp = s.hp / 2; break;
      case IT_CURE: m->status = 0; break;
    }
    addItem(ids[c], -1); sfx(SFX_HEAL);
  }
}

static void equipMenu(void){
  int id = pickMember("Chi si cambia d'abito?", 0);
  if (id < 0) return;
  static const char *const SL[] = { "Arma", "Abito", "Accessorio" };
  for (;;){
    const char *slots[3]; static char sb[3][48];
    for (int k = 0; k < 3; k++){ sb[k][0] = 0; cat(sb[k], SL[k]); cat(sb[k], ": "); cat(sb[k], G.ch[id].eq[k] == 255 ? "-" : ITEMS[G.ch[id].eq[k]].name); slots[k] = sb[k]; }
    int k = menuChoose(2, 2, 26, slots, 3, 0, 1);
    if (k < 0) return;
    const char *names[16]; static char nb[16][40]; int ids[16], n = 0;
    names[n] = "(togli)"; ids[n++] = 255;
    for (int i = 0; i < NUM_ITEMS && n < 16; i++){
      const Item *it = &ITEMS[i];
      if (it->type != IT_EQUIP || it->slot != k || !G.inv[i]) continue;
      if (it->who != 255 && !(it->who & (1 << id))) continue;
      nb[n][0] = 0; cat(nb[n], it->name); names[n] = nb[n]; ids[n++] = i;
    }
    int c = menuChoose(4, 8, 24, names, n > 9 ? 9 : n, 0, 1);
    if (c < 0) continue;
    if (G.ch[id].eq[k] != 255) addItem(G.ch[id].eq[k], 1);
    G.ch[id].eq[k] = ids[c];
    if (ids[c] != 255) addItem(ids[c], -1);
    Stats s = statsOf(id); if (G.ch[id].hp > s.hp) G.ch[id].hp = s.hp; if (G.ch[id].mp > s.mp) G.ch[id].mp = s.mp;
    sfx(SFX_OK);
  }
}

static void questsMenu(void){
  Win *w = winOpen(0, 0, 30, 20);
  winText(w, 4, 2, "Missioni", TC_BLUE);
  int y = 16, any = 0;
  for (int q = 0; q < NUM_QUESTS && y < 136; q++){
    if (!G.quest[q]) continue;
    any = 1;
    char b[60]; b[0] = 0; cat(b, QUESTS[q].name);
    if (G.quest[q] == 2) cat(b, "  (completata)");
    else { cat(b, "  "); catn(b, QUESTS[q].kind == Q_KILL ? G.qcount[q] : G.inv[QUESTS[q].target]); cat(b, "/"); catn(b, QUESTS[q].need); }
    winText(w, 4, y, b, G.quest[q] == 2 ? TC_GRAY : TC_TEXT); y += 12;
  }
  if (!any) winText(w, 4, 16, "Nessuna missione in corso. Parla con chi ha un problema!", TC_GRAY);
  char b[40]; b[0] = 0; cat(b, "Sigilli: "); catn(b, sigilli()); cat(b, "/4   Oro: "); catn(b, G.gold);
  winText(w, 4, 134, b, TC_GOLD);
  waitAB();
  winClose(w);
}

// ---------- mappa consultabile, come in Pokémon ----------
// in un paese (o in un suo edificio) si apre la pianta del paese; fuori, la provincia con le strade.
// R passa dalla pianta alla provincia e ritorno; la croce scorre i luoghi; A o B chiude.
// posizione (in pixel dello schermo) di un luogo nella vista v, -1 se non ci sta
static int viewPoint(int v, int map, int x, int y, int *sx, int *sy){
  const MapView *mv = &VIEWS[v];
  if (v == 0){
    int wx = x, wy = y;
    if (map != MAP_WORLD){ if (WORLD_POS[map][0] == 255) return 0; wx = WORLD_POS[map][0]; wy = WORLD_POS[map][1]; }
    *sx = mv->ox + wx * mv->scale + 2; *sy = mv->oy + wy * mv->scale + 2; return 1;
  }
  if (VIEW_POS[map][0] != v) return 0;
  if (VIEW_POS[map][1] != 255){ x = VIEW_POS[map][1]; y = VIEW_POS[map][2]; }
  *sx = mv->ox + x * mv->scale + (mv->scale >> 1); *sy = mv->oy + y * mv->scale + (mv->scale >> 1); return 1;
}
static void loadView(int v){
  const MapView *mv = &VIEWS[v];
  memcpy16(CHARBLOCK(1), mv->tiles, mv->ntiles * 16);
  memcpy16(MEM_PAL_BG + 8 * 16, mv->pal, mv->npal * 16);
  u16 *sb = SCREENBLOCK(28);
  for (int i = 0; i < 32 * 20; i++) sb[i] = mv->map[i];
  setScroll(1, 0, 0);
}
static void townMap(void){
  fadeOut(10);
  frameHook = 0;                            // niente animazione dell'acqua: scriverebbe sui tile della mappa
  REG_DISPCNT &= ~DCNT_BG(2);
  oamHideAll();
  const Goal *goal = 0;
  for (int i = 0; i < NUM_GOALS; i++) if (!flagGet(GOALS[i].flag)){ goal = &GOALS[i]; break; }
  int home = VIEW_POS[G.map][0];           // la pianta del paese in cui ci si trova (0 = provincia)
  int v = home, sel = 0, shown = -1, top = -1, px = 0, py = 0, hasMe = 0, gx = 0, gy = 0, hasGoal = 0;
  Win *w = 0;
  for (int t = 0, reload = 1;; t++){
    if (reload){
      reload = 0; shown = -1;
      if (t) fadeOut(8);
      oamHideAll(); loadView(v);
      hasMe = viewPoint(v, G.map, G.x, G.y, &px, &py);
      hasGoal = goal && viewPoint(v, goal->map, goal->x, goal->y, &gx, &gy);
      // il cursore parte dal luogo più vicino a dove siamo
      int best = 1 << 30; sel = 0;
      for (int i = 0; i < VIEWS[v].npins; i++){ int dx = VIEWS[v].pins[i].x - px, dy = VIEWS[v].pins[i].y - py, d = dx * dx + dy * dy; if (d < best){ best = d; sel = i; } }
      if (w){ winClose(w); w = 0; }
      if (t) fadeIn(8); else fadeIn(10);
    }
    const MapView *mv = &VIEWS[v]; const MapPin *pin = &mv->pins[sel];
    if (shown != sel){
      // la finestra sta dalla parte opposta al luogo scelto, così non lo copre
      int wantTop = pin->y >= 80;
      if (!w || wantTop != top){ if (w) winClose(w); top = wantTop; w = winOpen(0, top ? 0 : 15, 30, 5); }
      shown = sel; winClear(w);
      int x = winText(w, 4, 1, v ? mv->name : pin->name, TC_BLUE);
      if (v) x = winText(w, x + 6, 1, pin->name, TC_TEXT);
      if (hasMe && (px - pin->x) * (px - pin->x) + (py - pin->y) * (py - pin->y) <= 36) winText(w, x + 6, 1, "(sei qui)", TC_GRAY);
      char b[64]; b[0] = 0;
      if (goal){ strcat(b, "Meta: "); strcat(b, goal->label); } else strcat(b, "La provincia è di nuovo in pace.");
      winText(w, 4, 12, b, TC_TEXT);
      winText(w, 180, 12, v ? "R: provincia" : home ? "R: paese" : "", TC_GRAY);
    }
    // segnalini: tu (stella che lampeggia), la meta (punto esclamativo che saltella), il cursore sul luogo
    if (hasMe && (t & 16)) oamSet(0, px - 4, py - 4, OBJ_SQUARE, OBJ_SIZE(0), 2 | OBJ_PAL(0)); else oamBuf[0].a0 = OBJ_HIDE;
    if (hasGoal) oamSet(1, gx - 4, gy - 12 - ((t >> 3) & 1) * 2, OBJ_SQUARE, OBJ_SIZE(0), 11 | OBJ_PAL(0)); else oamBuf[1].a0 = OBJ_HIDE;
    oamSet(2, pin->x - 4, pin->y - 14 - ((t >> 4) & 1), OBJ_SQUARE, OBJ_SIZE(0), 1 | OBJ_PAL(0));
    TEST_WAITING();
    frame();
    if (keysRep & (KEY_RIGHT | KEY_DOWN)){ sel = (sel + 1) % mv->npins; sfx(SFX_CURSOR); }
    if (keysRep & (KEY_LEFT | KEY_UP)){ sel = (sel + mv->npins - 1) % mv->npins; sfx(SFX_CURSOR); }
    if ((keysHit & (KEY_R | KEY_L)) && home){ v = v ? 0 : home; reload = 1; sfx(SFX_OK); }
    if (keysHit & (KEY_A | KEY_B)){ sfx(SFX_CANCEL); break; }
  }
  fadeOut(10);
  if (w) winClose(w);
  oamHideAll();
  worldRestoreGfx();
  fadeIn(10);
}

void pauseMenu(void){
  static const char *const OPTS[] = { "Squadra", "Oggetti", "Equip", "Missioni", "Salva", "Mappa", "Chiudi" };
  oamHideAll();
  for (;;){
    int c = menuChoose(20, 0, 10, OPTS, 7, 0, 1);
    if (c < 0 || c == 6) break;
    if (c == 5){ townMap(); continue; }
    if (c == 0) teamMenu();
    else if (c == 1) itemsMenu();
    else if (c == 2) equipMenu();
    else if (c == 3) questsMenu();
    else if (c == 4){ saveGame(); sfx(SFX_LEVEL); say("", "Partita salvata sulla cartuccia."); }
  }
  winCloseAll();
}
