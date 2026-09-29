// The Menace of Eterna - versione Game Boy Advance.
// Titolo, scelta dell'eroe, poi l'esplorazione (world.c) che chiama battaglie, menu ed eventi.
#include "gba.h"
#include "sys.h"
#include "text.h"
#include "state.h"
#include "world.h"

void titleBackground(void){
  memcpy16(CHARBLOCK(1), TITLE_TILES, TITLE_NTILES * 16);
  memcpy16(MEM_PAL_BG + 8 * 16, TITLE_PAL, TITLE_NPAL * 16);
  u16 *sb = SCREENBLOCK(28);
  for (int i = 0; i < 32 * 20; i++) sb[i] = TITLE_MAP[i];
  for (int i = 32 * 20; i < 1024; i++) sb[i] = 0;
  REG_BGCNT(1) = 2 | (1 << 2) | (28 << 8);
  setScroll(1, 0, 0);
  MEM_PAL_BG[0] = TITLE_PAL[1];                  // fuori dall'immagine: il colore più scuro
}

// scelta dell'eroe: i due amici affiancati, a grandezza doppia
static int chooseHero(void){
  Win *w = winOpen(1, 12, 28, 7);
  Win *t = winOpen(4, 1, 22, 3); winText(t, 8, 1, "Chi vuoi essere?", TC_BLUE);
  static const int ID[2] = { CH_STE, CH_RIKI };
  static const char *const DESC[2] = {
    "Ste, il Mago: alto, calmo e ironico. Magie potenti, meno resistente.",
    "Riki, il Samurai: basso e massiccio, katana Shura. Colpi fisici devastanti." };
  for (int k = 0; k < 2; k++){
    memcpy16(OBJ_TILES + (256 + k * 8) * 16, LOOKS[CHARS[ID[k]].look].tiles, 128);
    for (int c = 0; c < 16; c++) MEM_PAL_OBJ[(4 + k) * 16 + c] = LOOKS[CHARS[ID[k]].look].pal[c];
  }
  setAffine(0, 0x80, 0, 0, 0x80);
  int sel = 0, shown = -1;
  for (;;){
    for (int k = 0; k < 2; k++) oamSet(4 + k, 56 + k * 96, 36 + (k == sel ? -((frameCount >> 3) & 1) * 2 : 0), OBJ_TALL | OBJ_DOUBLE, OBJ_SIZE(2), (256 + k * 8) | OBJ_PAL(4 + k));
    cursorAt(52 + sel * 96, 108);
    if (shown != sel){
      shown = sel; winClear(w);
      winText(w, 4, 2, CHARS[ID[sel]].name, TC_BLUE); winText(w, 40, 2, CHARS[ID[sel]].cls, TC_GRAY);
      // descrizione su due righe
      const char *d = DESC[sel]; char l1[64], l2[64]; int i = 0, cut = 0, x = 0;
      for (; d[i]; i++){ x += FONT_W[(u8)d[i]] + 1; if (d[i] == ' ' && x < 215) cut = i; if (x >= 215) break; }
      if (!d[i]) cut = i;
      for (int k = 0; k < cut; k++) l1[k] = d[k];
      l1[cut] = 0;
      int j = 0; for (int k = cut + (d[cut] ? 1 : 0); d[k]; k++) l2[j++] = d[k]; l2[j] = 0;
      winText(w, 4, 15, l1, TC_TEXT); winText(w, 4, 26, l2, TC_TEXT);
    }
    frame();
    if (keysHit & (KEY_LEFT | KEY_RIGHT)){ sel ^= 1; sfx(SFX_CURSOR); }
    if (keysHit & KEY_A){ sfx(SFX_OK); break; }
  }
  winClose(w); winClose(t); oamHideAll(); cursorHide();
  return ID[sel];
}

static void titleScreen(void){
  REG_DISPCNT = DCNT_MODE0 | DCNT_BG(0) | DCNT_BG(1) | DCNT_OBJ | DCNT_OBJ_1D;
  setBrightness(-16);
  titleBackground();
  textInit();
  musicPlay(MUS_TITLE);
  frame();
  fadeIn(30);
  // "premi START" lampeggiante
  Win *p = winOpen(8, 15, 14, 3);
  for (int t = 0;; t++){
    winClear(p);
    if ((t >> 5) & 1) winText(p, 14, 1, "Premi START", TC_TEXT);
    frame();
    if (keysHit & (KEY_START | KEY_A)) break;
  }
  winClose(p);
  sfx(SFX_OK);
  const char *opts[2]; int n = 0, cont = hasSave();
  if (cont) opts[n++] = "Continua";
  opts[n++] = "Nuova partita";
  int c = menuChoose(9, 13, 12, opts, n, 0, 0);
  if (cont && c == 0 && loadGame()){
    fadeOut(20);
    return;
  }
  int hero = chooseHero();
  newGame(hero);
  fadeOut(20);
}

int main(void){
  sysInit();
  titleScreen();
  oamHideAll(); winCloseAll();
  worldLoad(G.map, G.x, G.y, G.dir);
  frame();
  fadeIn(20);
  worldRun();
  return 0;
}
