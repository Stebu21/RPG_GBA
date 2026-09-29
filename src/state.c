#include "state.h"
#include "sys.h"
#include <string.h>
#include <stddef.h>

GameState G;

int flagGet(int f){ return f < 128 && (G.flags[f >> 3] >> (f & 7)) & 1; }
void flagSet(int f){ if (f < 128) G.flags[f >> 3] |= 1 << (f & 7); }
int condOk(const u8 *has, const u8 *not){
  for (; has && *has != 255; has++) if (!flagGet(*has)) return 0;
  for (; not && *not != 255; not++) if (flagGet(*not)) return 0;
  return 1;
}
int sigilli(void){ return flagGet(FLAG_SIGILLO_ALBA) + flagGet(FLAG_SIGILLO_MERIGGIO) + flagGet(FLAG_SIGILLO_VESPRO) + flagGet(FLAG_SIGILLO_NOTTE); }
int expToNext(int level){ return 20 * level * level; }

Stats statsOf(int id){
  const CharDef *c = &CHARS[id]; const Member *m = &G.ch[id];
  int lv = m->level - 1;
  Stats s = {
    c->base.hp + c->growth10.hp * lv / 10, c->base.mp + c->growth10.mp * lv / 10, c->base.atk + c->growth10.atk * lv / 10,
    c->base.def + c->growth10.def * lv / 10, c->base.mag + c->growth10.mag * lv / 10, c->base.spr + c->growth10.spr * lv / 10,
    c->base.spd + c->growth10.spd * lv / 10 };
  for (int k = 0; k < 3; k++){
    if (m->eq[k] == 255) continue;
    const Item *e = &ITEMS[m->eq[k]];
    s.atk += e->atk; s.def += e->def; s.mag += e->mag; s.spr += e->spr; s.spd += e->spd; s.hp += e->hp; s.mp += e->mp;
  }
  return s;
}
int knowsAbility(int id, int ab){
  const CharDef *c = &CHARS[id];
  for (int i = 0; i < c->nlearn; i++) if (c->learn[i].ab == ab && c->learn[i].lv <= G.ch[id].level) return 1;
  return (G.ch[id].tomes[ab >> 5] >> (ab & 31)) & 1;
}
int abilityList(int id, u8 *out){
  int n = 0;
  for (int ab = 0; ab < NUM_ABILITIES && n < 24; ab++) if (!ABILITIES[ab].limit && knowsAbility(id, ab)) out[n++] = ab;
  return n;
}
int gainExp(int id, int amount, u8 *learned, int *nlearned){
  Member *m = &G.ch[id]; int levels = 0;
  if (m->level >= MAX_LEVEL) return 0;
  Stats before = statsOf(id);
  m->exp += amount;
  while (m->level < MAX_LEVEL && m->exp >= (u32)expToNext(m->level)){
    m->exp -= expToNext(m->level); m->level++; levels++;
    const CharDef *c = &CHARS[id];
    for (int i = 0; i < c->nlearn; i++) if (c->learn[i].lv == m->level && learned && *nlearned < 8) learned[(*nlearned)++] = c->learn[i].ab;
  }
  if (levels){ Stats after = statsOf(id); m->hp += after.hp - before.hp; m->mp += after.mp - before.mp; }
  return levels;
}
void joinParty(int id){
  if (G.joined & (1 << id)) return;
  G.joined |= 1 << id;
  Member *m = &G.ch[id];
  // chi arriva più tardi non parte da zero: allineato al livello del gruppo
  int lv = G.ch[G.hero].level; if (lv < 3) lv = 3;
  m->level = lv; m->exp = 0; m->eq[0] = m->eq[1] = m->eq[2] = 255;
  Stats s = statsOf(id); m->hp = s.hp; m->mp = s.mp;
  if (G.nparty < MAX_PARTY) G.party[G.nparty++] = id;
}
void fullHeal(void){ for (int i = 0; i < 8; i++) if (G.joined & (1 << i)){ Stats s = statsOf(i); G.ch[i].hp = s.hp; G.ch[i].mp = s.mp; G.ch[i].status = 0; } }
void addItem(int it, int n){ if (it < 128){ int v = G.inv[it] + n; G.inv[it] = v > 99 ? 99 : v < 0 ? 0 : v; } }

void newGame(int hero){
  memset(&G, 0, sizeof G);
  G.magic = 0x4D454E41; G.version = SAVE_VERSION;
  G.hero = hero; G.map = MAP_ACCADEMIA; G.x = 9; G.y = 8; G.dir = 1;   // davanti al Rettore, come nella versione web
  G.gold = 350;
  int partner = hero == CH_STE ? CH_RIKI : CH_STE;
  G.ch[CH_STE].level = G.ch[CH_RIKI].level = 3;
  joinParty(hero); joinParty(partner);
  // equipaggiamento iniziale, come nella versione web
  G.ch[CH_STE].eq[0] = IT_BASTONE_BETULLA; G.ch[CH_STE].eq[1] = IT_TUNICA_ALLIEVO;
  G.ch[CH_RIKI].eq[0] = IT_KATANA_ACCIAIO; G.ch[CH_RIKI].eq[1] = IT_GI_RINFORZATO;
  fullHeal();
  G.inv[IT_POZIONE] = 5; G.inv[IT_ETERE] = 2; G.inv[IT_ANTIDOTO] = 1; G.inv[IT_CODA_FENICE] = 1;
}

// ---------- SRAM: firma + dati + somma di controllo ----------
static u16 checksum(void){ const u8 *p = (const u8*)&G; u16 s = 0x1234; for (u32 i = 0; i < offsetof(GameState, sum); i++) s = (s << 1 | s >> 15) ^ p[i]; return s; }
volatile u8 saveVerified;   // 1 se la firma riletta dalla SRAM è giusta (serve ai controlli)
int saveGame(void){ G.sum = checksum(); sramWrite(0, &G, sizeof G); saveVerified = hasSave(); return saveVerified; }
int loadGame(void){
  GameState tmp = G;
  sramRead(0, &G, sizeof G);
  if (G.magic != 0x4D454E41 || G.version != SAVE_VERSION || G.sum != checksum()){ G = tmp; return 0; }
  return 1;
}
// c'è un salvataggio utilizzabile: firma e versione giuste (un salvataggio di una versione vecchia del gioco si ignora)
int hasSave(void){ u8 h[8]; sramRead(0, h, 8); u32 m = h[0] | h[1] << 8 | h[2] << 16 | (u32)h[3] << 24; return m == 0x4D454E41 && h[4] == SAVE_VERSION; }
