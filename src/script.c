// Trama ed interazioni: eventi a passi, dialoghi degli NPC, missioni, forzieri, negozi, locande.
#include "script.h"
#include "state.h"
#include "sys.h"
#include "text.h"
#include "world.h"
#include "battle.h"
#include "menu.h"
#include <string.h>

static void sayLines(const Line *l, int n){ for (int i = 0; i < n; i++) say(l[i].who, l[i].text); }
static char buf[160];
static void cat(char *d, const char *s){ while (*d) d++; while ((*d++ = *s++)); }

void gameOver(void){
  musicStop();
  winCloseAll(); oamHideAll();
  say("", "La squadra è stata sconfitta... Il tempo di Eterna si richiude su Varese.");
  fadeOut(30);
  asm volatile("swi 0x00");                  // riavvio: si riparte dal titolo (e dall'ultimo salvataggio)
}

static void ending(void){
  musicPlay(MUS_ENDING);
  fadeOut(40);
  winCloseAll(); oamHideAll();
  extern void titleBackground(void);
  frameHook = 0;
  titleBackground(); textInit();
  frame(); fadeIn(40);
  static const char *const LINES[] = {
    "Con Eterna sconfitta, il tempo riprende a scorrere sulla provincia di Varese.",
    "Le campane di San Vittore suonano all'ora giusta. A Vedano il Lazzaretto dorme di nuovo.",
    "Ste e Riki tornano all'Accademia, stanchi e affamati: il pranzo, stavolta, non lo saltano.",
    "THE MENACE OF ETERNA - Chronicles of Varese. Grazie per aver giocato!",
  };
  for (int i = 0; i < 4; i++) say("", LINES[i]);
  Win *fin = winOpen(10, 14, 10, 4); winText(fin, 22, 4, "F I N E", TC_GOLD);
  for (int i = 0; i < 120; i++) frame();
  saveGame();
#ifdef AUTOTEST
  { extern void testSnap(int), testDone(void); testSnap(99); testDone(); }
#endif
  fadeOut(60);
  asm volatile("swi 0x00");
}

static int battleBackdrop(void){ return curMap->zone != 255 ? ZONES[curMap->zone].backdrop : G.map == MAP_SACROMONTE ? 5 : 0; }
static void runSteps(const Step *s, int n){
  for (int i = 0; i < n; i++, s++){
    switch (s->op){
      case S_DLG: sayLines(s->lines, s->b); break;
      case S_FLAG: flagSet(s->a); break;
      case S_JOIN: joinParty(s->a); sfx(SFX_LEVEL); buf[0] = 0; cat(buf, CHARS[s->a].name); cat(buf, " si unisce alla squadra!"); say("", buf); break;
      case S_BATTLE: {
        u8 m = s->b;
        // il boss della zona: sfondo della mappa in cui ci si trova
        int bd = G.map == MAP_VEDANO ? 1 : G.map == MAP_CASTIGLIONE ? 2 : G.map == MAP_JERAGO ? 3 : G.map == MAP_SAMARATE ? 4 : G.map == MAP_SACROMONTE ? 5 : battleBackdrop();
        int r = battleRun(&m, 1, 1, bd);
        worldRedraw();
        if (r != 1){ gameOver(); return; }
        break;
      }
      case S_ITEM: addItem(s->a, s->b); sfx(SFX_ITEM); buf[0] = 0; cat(buf, "Hai ottenuto: "); cat(buf, ITEMS[s->a].name); cat(buf, "!"); say("", buf); break;
      case S_HEAL: fullHeal(); break;
      case S_ENDING: ending(); return;
    }
  }
}
void runEvent(int ev){
  const Event *e = &EVENTS[ev];
  if (condOk(e->has, e->not)) runSteps(e->steps, e->n);
  else if (e->ndone) runSteps(e->done, e->ndone);
}
void scriptEnterEvents(void){
  for (int i = 0; i < NUM_EVENTS; i++){ const Event *e = &EVENTS[i]; if (e->map == G.map && e->enter && condOk(e->has, e->not)){ runSteps(e->steps, e->n); return; } }
}

void registerKill(int mon){
  for (int q = 0; q < NUM_QUESTS; q++) if (G.quest[q] == 1 && QUESTS[q].kind == Q_KILL && QUESTS[q].target == mon && G.qcount[q] < 255) G.qcount[q]++;
}
static int questReady(int q){
  const Quest *Q = &QUESTS[q];
  return Q->kind == Q_KILL ? G.qcount[q] >= Q->need : G.inv[Q->target] >= Q->need;
}
static void questTalk(int q){
  const Quest *Q = &QUESTS[q];
  static const char *const YN[] = { "Accetto", "Non ora" };
  if (G.quest[q] == 2){ sayLines(Q->after, Q->nafter); return; }
  if (G.quest[q] == 0){
    sayLines(Q->offer, Q->noffer);
    buf[0] = 0; cat(buf, "Missione: "); cat(buf, Q->name); say("", buf);
    if (menuChoose(19, 7, 10, YN, 2, 0, 1) == 0){ G.quest[q] = 1; G.qcount[q] = 0; sayLines(Q->accepted, Q->naccepted); }
    return;
  }
  if (questReady(q)){
    if (Q->kind == Q_ITEM) addItem(Q->target, -Q->need);
    G.quest[q] = 2; G.gold += Q->gold; if (Q->item != 255) addItem(Q->item, Q->qty);
    sayLines(Q->complete, Q->ncomplete);
    sfx(SFX_LEVEL);
    buf[0] = 0; cat(buf, "Missione completata! "); char n[12]; cat(buf, fmtNum(n, Q->gold)); cat(buf, " oro");
    if (Q->item != 255){ cat(buf, ", "); cat(buf, ITEMS[Q->item].name); }
    cat(buf, "."); say("", buf);
    return;
  }
  sayLines(Q->progress, Q->nprogress);
  char a[12], b[12]; buf[0] = 0; cat(buf, "Progresso: "); cat(buf, fmtNum(a, Q->kind == Q_KILL ? G.qcount[q] : G.inv[Q->target])); cat(buf, "/"); cat(buf, fmtNum(b, Q->need)); say("", buf);
}

static void shop(int id){
  const Shop *sh = &SHOPS[id];
  static const char *names[40]; static char lines[40][40];
  for (;;){
    static int page; if (page * 9 >= sh->n) page = 0;
    int base = page * 9, n = sh->n - base; if (n > 9) n = 9;
    for (int i = 0; i < n; i++){
      const Item *it = &ITEMS[sh->items[base + i]]; char p[12];
      lines[i][0] = 0; cat(lines[i], it->name); cat(lines[i], "  "); cat(lines[i], fmtNum(p, it->price));
      names[i] = lines[i];
    }
    int extra = sh->n > 9;
    if (extra){ names[n] = "Altra merce..."; }
    names[n + extra] = "Esci";
    Win *gold = winOpen(0, 0, 12, 4); char g[12]; winText(gold, 4, 4, "Oro:", TC_TEXT); winNum(gold, 80, 4, G.gold, TC_GOLD, 1);
    int c = menuChoose(12, 0, 18, names, n + extra + 1, 0, 1);
    winClose(gold); (void)g;
    if (c < 0 || c == n + extra) return;
    if (extra && c == n){ page++; continue; }
    const Item *it = &ITEMS[sh->items[base + c]];
    if (G.gold < it->price){ sfx(SFX_CANCEL); say("Bottegaio", "Non avete abbastanza oro, ragazzi."); continue; }
    if (G.inv[sh->items[base + c]] >= 99){ say("Bottegaio", "Ne avete già fin troppi!"); continue; }
    G.gold -= it->price; addItem(sh->items[base + c], 1); sfx(SFX_ITEM);
    buf[0] = 0; cat(buf, "Comprato: "); cat(buf, it->name); cat(buf, ". Grazie!"); say("Bottegaio", buf);
  }
}

void scriptTrigger(const Trigger *t){
  switch (t->type){
    case T_NPC: {
      const Npc *npc = &NPCS[t->a];
      const NpcVariant *v = &npc->v[npc->n - 1];
      for (int i = 0; i < npc->n; i++) if (condOk(npc->v[i].has, npc->v[i].not)){ v = &npc->v[i]; break; }
      sayLines(v->lines, v->n);
      break;
    }
    case T_QUEST: questTalk(t->a); break;
    case T_CHEST: {
      int id = t->a;
      if ((G.chests[id >> 3] >> (id & 7)) & 1){ say("", "Il forziere è vuoto."); break; }
      G.chests[id >> 3] |= 1 << (id & 7);
      int it = t->b & 255, q = t->b >> 8;
      addItem(it, q); sfx(SFX_ITEM);
      char n[12]; buf[0] = 0; cat(buf, "Hai trovato: "); cat(buf, ITEMS[it].name); if (q > 1){ cat(buf, " x"); cat(buf, fmtNum(n, q)); } cat(buf, "!");
      worldDrawActors();
      say("", buf);
      break;
    }
    case T_DOOREV: case T_EVENT: runEvent(t->a); break;
    case T_SHOP: say("Bottegaio", "Benvenuti! Date un'occhiata alla merce."); shop(t->a); break;
    case T_INN: {
      static const char *const YN[] = { "Riposare", "No, grazie" };
      char n[12]; buf[0] = 0; cat(buf, "Un letto caldo e una zuppa: "); cat(buf, fmtNum(n, t->a)); cat(buf, " oro a testa... anzi, per tutti!");
      say("Oste", buf);
      if (menuChoose(19, 7, 10, YN, 2, 0, 1) == 0){
        if (G.gold < t->a){ say("Oste", "Niente oro, niente letto. Mi spiace!"); break; }
        G.gold -= t->a; fadeOut(20); fullHeal(); sfx(SFX_HEAL); fadeIn(20);
        say("Oste", "Dormito bene? HP e MP al massimo!");
      }
      break;
    }
    case T_MOUNT: {
      static const char *const NAME[] = { "", "L'asinello", "Il cavallo" };
      G.mounts |= 1 << t->a; G.mount = t->a; sfx(SFX_ITEM);
      buf[0] = 0; cat(buf, NAME[t->a]); cat(buf, " ti annusa la mano e si lascia accarezzare: ora è tuo! Ci sali in groppa.");
      say("", buf);
      say("", "SELECT: sali e scendi. In sella si va più veloci, e col cavallo tenendo premuto B si galoppa.");
      worldRedraw();
      break;
    }
    case T_HEAL: fullHeal(); sfx(SFX_HEAL); say("", "Una luce calda vi avvolge. HP e MP completamente ripristinati!"); break;
  }
}
