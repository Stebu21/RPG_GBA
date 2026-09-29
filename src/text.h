// Finestre e testo a larghezza variabile sul livello BG0.
#pragma once
#include "gba.h"

typedef struct { u8 x, y, w, h; u16 tile0; u8 used; } Win;
enum { TC_TEXT = 5, TC_SHADOW = 6, TC_RED = 7, TC_GREEN = 8, TC_BLUE = 9, TC_GOLD = 10, TC_PURPLE = 11, TC_GRAY = 12, TC_FILL = 1, TC_WHITE = 15, TC_NAVY = 14 };

void textInit(void);                         // carica i tile dell'interfaccia e svuota BG0
Win *winOpen(int x, int y, int w, int h);    // finestra con cornice (in tile), interno pronto a disegnare
void winClose(Win *w);
void winCloseAll(void);
void winClear(Win *w);
void winRect(Win *w, int x, int y, int ww, int hh, int color);
int winText(Win *w, int x, int y, const char *s, int color);   // restituisce la x finale
int textWidth(const char *s);
void winNum(Win *w, int x, int y, int n, int color, int rightAlign);
char *fmtNum(char *buf, int n);              // intero in stringa (buffer di almeno 12 byte)

// dialogo bloccante con nome e pagine; restituisce quando il giocatore ha letto tutto
void say(const char *who, const char *text);
// menu a scelta: -1 se annullato con B (se allowCancel)
int menuChoose(int x, int y, int w, const char *const *opts, int n, int start, int allowCancel);
// messaggio breve in alto (per esempio in battaglia): resta finché non si chiama msgClose
void msgShow(const char *s);
void msgClose(void);
// sprite del cursore (usa l'ultimo slot OAM)
void cursorAt(int x, int y);
void cursorHide(void);
