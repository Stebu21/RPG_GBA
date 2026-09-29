// Finestre e testo a larghezza variabile: ogni finestra ha tile propri in cui si disegnano i glifi.
#include "text.h"
#include "sys.h"
#include "data.h"

#define TXT_SB 31                             // schermata di BG0
#define POOL0 16                              // primi tile liberi del pool di testo
#define POOL_END 512
static Win wins[8];
static u16 poolTop = POOL0;

void textInit(void){
  memcpy16(CHARBLOCK(0), UI_TILES, UI_NTILES * 16);
  memset16(SCREENBLOCK(TXT_SB), 0, 1024);
  REG_BGCNT(0) = 0 | (TXT_SB << 8);            // priorità 0 (sopra tutto), charblock 0
  for (int i = 0; i < 16; i++) MEM_PAL_BG[i] = BG_PALETTES[0][i];
  // sprite dell'interfaccia: tile OBJ 0-20, tavolozza OBJ 0
  memcpy16(OBJ_TILES, OBJ_UI_TILES, 21 * 16);
  for (int i = 0; i < 16; i++) MEM_PAL_OBJ[i] = OBJ_UI_PAL[i];
  winCloseAll();
}

static inline u16 *tileAddr(u16 t){ return CHARBLOCK(0) + t * 16; }
static void pset(Win *w, int x, int y, int c){
  int iw = w->w - 2;
  if (x < 0 || y < 0 || x >= iw * 8 || y >= (w->h - 2) * 8) return;
  u16 *t = tileAddr(w->tile0 + (y >> 3) * iw + (x >> 3));
  volatile u16 *p = &t[(y & 7) * 2 + ((x & 7) >> 2)];
  int sh = (x & 3) * 4;
  *p = (*p & ~(15 << sh)) | (c << sh);
}

Win *winOpen(int x, int y, int w, int h){
  Win *win = 0;
  for (int i = 0; i < 8; i++) if (!wins[i].used){ win = &wins[i]; break; }
  if (!win) return &wins[0];
  int n = (w - 2) * (h - 2);
  oamBuf[124].a0 = oamBuf[125].a0 = OBJ_HIDE;   // la bussola dell'obiettivo non copre le finestre
  if (poolTop + n > POOL_END) poolTop = POOL0;   // non dovrebbe succedere: le finestre sono poche
  *win = (Win){ x, y, w, h, poolTop, 1 };
  poolTop += n;
  u16 *sb = SCREENBLOCK(TXT_SB);
  for (int j = 0; j < h; j++) for (int i = 0; i < w; i++){
    u16 t;
    if (j == 0) t = i == 0 ? 2 : i == w - 1 ? 4 : 3;
    else if (j == h - 1) t = i == 0 ? 7 : i == w - 1 ? 9 : 8;
    else if (i == 0) t = 5; else if (i == w - 1) t = 6;
    else t = win->tile0 + (j - 1) * (w - 2) + (i - 1);
    sb[(y + j) * 32 + x + i] = t;
  }
  winClear(win);
  return win;
}
void winClear(Win *w){ memset16(tileAddr(w->tile0), 0x1111, (w->w - 2) * (w->h - 2) * 16); }
void winClose(Win *w){
  if (!w || !w->used) return;
  u16 *sb = SCREENBLOCK(TXT_SB);
  for (int j = 0; j < w->h; j++) for (int i = 0; i < w->w; i++) sb[(w->y + j) * 32 + w->x + i] = 0;
  w->used = 0;
  // libera il pool se era l'ultima finestra aperta
  u16 top = POOL0;
  for (int i = 0; i < 8; i++) if (wins[i].used){ u16 e = wins[i].tile0 + (wins[i].w - 2) * (wins[i].h - 2); if (e > top) top = e; }
  poolTop = top;
}
void winCloseAll(void){ for (int i = 0; i < 8; i++) if (wins[i].used) winClose(&wins[i]); poolTop = POOL0; memset16(SCREENBLOCK(TXT_SB), 0, 1024); }
void winRect(Win *w, int x, int y, int ww, int hh, int c){ for (int j = 0; j < hh; j++) for (int i = 0; i < ww; i++) pset(w, x + i, y + j, c); }

int textWidth(const char *s){ int x = 0; for (; *s; s++){ u8 c = *s; if (c == '\n') break; x += (c == ' ' ? 3 : FONT_W[c]) + 1; } return x; }
static int glyph(Win *w, int x, int y, u8 c, int color){
  if (c == ' ') return 4;
  int gw = FONT_W[c];
  for (int r = 0; r < 9; r++){ u16 bits = FONT_ROWS[c][r]; for (int i = 0; i < gw; i++) if (bits & (1 << i)) pset(w, x + i + 1, y + r + 1, TC_SHADOW); }
  for (int r = 0; r < 9; r++){ u16 bits = FONT_ROWS[c][r]; for (int i = 0; i < gw; i++) if (bits & (1 << i)) pset(w, x + i, y + r, color); }
  return gw + 1;
}
int winText(Win *w, int x, int y, const char *s, int color){ for (; *s; s++) x += glyph(w, x, y, (u8)*s, color); return x; }
char *fmtNum(char *buf, int n){
  char tmp[12]; int i = 0, neg = n < 0; if (neg) n = -n;
  do { tmp[i++] = '0' + n % 10; n /= 10; } while (n);
  int k = 0; if (neg) buf[k++] = '-'; while (i) buf[k++] = tmp[--i]; buf[k] = 0; return buf;
}
void winNum(Win *w, int x, int y, int n, int color, int right){ char b[12]; fmtNum(b, n); if (right) x -= textWidth(b); winText(w, x, y, b, color); }

void cursorAt(int x, int y){ oamSet(127, x, y, OBJ_SQUARE, OBJ_SIZE(0), 0 | OBJ_PAL(0)); }
void cursorHide(void){ oamBuf[127].a0 = OBJ_HIDE; }

// ---------- dialoghi ----------
#define DLG_LINES 3
#define LINE_H 11
// spezza il testo in righe che stanno in `width` pixel (a capo sulle parole)
static int wrap(const char *s, int width, const char **starts, u8 *lens, int max){
  int n = 0;
  while (*s && n < max){
    while (*s == ' ') s++;
    const char *line = s, *lastSpace = 0; int x = 0;
    while (*s && *s != '\n'){
      int cw = (*s == ' ' ? 3 : FONT_W[(u8)*s]) + 1;
      if (x + cw > width){ if (lastSpace){ s = lastSpace; } break; }
      if (*s == ' ') lastSpace = s;
      x += cw; s++;
    }
    starts[n] = line; lens[n] = s - line; n++;
    if (*s == '\n') s++;
  }
  return n;
}
static void waitButton(int x, int y){
  for (int t = 0;; t++){
    oamSet(126, x, y + ((t >> 3) & 1), OBJ_SQUARE, OBJ_SIZE(0), 1 | OBJ_PAL(0));
    TEST_WAITING();
    frame();
    if (keysHit & (KEY_A | KEY_B)) break;
  }
  oamBuf[126].a0 = OBJ_HIDE;
  sfx(SFX_CURSOR);
}
void say(const char *who, const char *text){
  Win *box = winOpen(0, 13, 30, 7), *tag = 0;
  if (who && *who){ int tw = (textWidth(who) + 12 + 7) / 8 + 2; tag = winOpen(1, 10, tw < 5 ? 5 : tw, 3); winText(tag, 3, 1, who, TC_BLUE); }
  static const char *st[40]; static u8 ln[40];
  int n = wrap(text, 222, st, ln, 40);
  for (int page = 0; page < n; page += DLG_LINES){
    winClear(box);
    for (int l = 0; l < DLG_LINES && page + l < n; l++){
      int x = 4, y = 2 + l * LINE_H;
      for (int k = 0; k < ln[page + l]; k++){
        x += glyph(box, x, y, (u8)st[page + l][k], TC_TEXT);
        if (!(keysHeld & (KEY_A | KEY_B)) || (k & 1)) frame();
      }
    }
    waitButton(222, 146);
  }
  winClose(box); if (tag) winClose(tag);
}

int menuChoose(int x, int y, int w, const char *const *opts, int n, int start, int allowCancel){
  int h = (n * 12 + 4 + 7) / 8 + 2;
  Win *win = winOpen(x, y, w, h);
  for (int i = 0; i < n; i++) winText(win, 10, 2 + i * 12, opts[i], TC_TEXT);
  int sel = start < n ? start : 0;
  for (;;){
    cursorAt((x + 1) * 8 + 1, (y + 1) * 8 + 3 + sel * 12);
    TEST_WAITING();
    frame();
    if (keysRep & KEY_DOWN){ sel = (sel + 1) % n; sfx(SFX_CURSOR); }
    if (keysRep & KEY_UP){ sel = (sel + n - 1) % n; sfx(SFX_CURSOR); }
    if (keysHit & KEY_A){ sfx(SFX_OK); break; }
    if ((keysHit & KEY_B) && allowCancel){ sfx(SFX_CANCEL); sel = -1; break; }
  }
  cursorHide(); winClose(win);
  return sel;
}

static Win *msgWin;
void msgShow(const char *s){ if (!msgWin) msgWin = winOpen(0, 0, 30, 4); winClear(msgWin); winText(msgWin, 4, 4, s, TC_TEXT); }
void msgClose(void){ if (msgWin){ winClose(msgWin); msgWin = 0; } }
