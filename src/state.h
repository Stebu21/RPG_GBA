// Stato della partita: squadra, livelli, inventario, flag, missioni, salvataggio in SRAM.
#pragma once
#include "data.h"

#define MAX_PARTY 4
#define MAX_LEVEL 99
typedef struct {
  u8 level, eq[3];               // equipaggiamento: arma, abito, accessorio (0xFF = niente)
  s16 hp, mp;
  u32 exp;
  u32 tomes[4];                  // abilità imparate dai tomi (bit per abilità)
  u8 status;                     // 1 veleno, 2 sonno (solo in battaglia, azzerato dopo)
} Member;
#define SAVE_VERSION 2   // 2: ruoli nuovi (le abilità imparate dai tomi cambiano posto: i salvataggi della 1 non valgono)
typedef struct {
  u32 magic;
  u8 version, hero, map, x, y, dir;
  u8 party[MAX_PARTY], nparty;   // membri in battaglia (Ste e Riki sempre dentro)
  u16 joined;                    // bit per personaggio arrivato
  Member ch[8];
  u8 inv[128];                   // quantità per oggetto
  u32 gold;
  u8 flags[16];
  u8 chests[4];
  u8 quest[16], qcount[16];      // stato missione: 0 no, 1 accettata, 2 conclusa
  u8 visited;                    // paesi visitati (per il viaggio rapido): bit per mappa-paese
  u32 steps, frames;
  u16 sum;
} GameState;
extern GameState G;

int flagGet(int f);
void flagSet(int f);
int condOk(const u8 *has, const u8 *not);
void newGame(int hero);
Stats statsOf(int id);           // statistiche con livello ed equipaggiamento
int expToNext(int level);
int gainExp(int id, int amount, u8 *learned, int *nlearned);   // livelli guadagnati
int knowsAbility(int id, int ab);
int abilityList(int id, u8 *out);   // abilità conosciute (esclusa la Limite)
void joinParty(int id);
void fullHeal(void);
void addItem(int it, int n);
int sigilli(void);

int saveGame(void);
int loadGame(void);
int hasSave(void);
