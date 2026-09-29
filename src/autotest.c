// Partita automatica per i controlli (solo con -DAUTOTEST): tasti in sequenza e istantanee.
// tools/check.mjs ferma il gioco in testSnap() con GDB e salva VRAM, tavolozze, sprite e stato.
#ifdef AUTOTEST
#include "sys.h"
#include "state.h"

volatile int testSnapId, testForceBattle, testNoEncounters = 1, testWarpMap = -1, testWarpX, testWarpY;
volatile u32 testWorldIdle, testWaiting;   // ultimo fotogramma in cui il mondo era fermo / un testo o menu aspettava un tasto
__attribute__((noinline)) void testSnap(int id){ testSnapId = id; asm volatile("" ::: "memory"); }
__attribute__((noinline)) void testDone(void){ asm volatile("" ::: "memory"); for (;;) frame(); }

enum { OP_NONE, OP_SNAP, OP_DONE, OP_FORCE, OP_ENC, OP_MASH, OP_WARP, OP_LEVEL };
typedef struct { u16 keys, frames; u8 op, arg, arg2; } TStep;
#define W(n)        { 0, n, 0, 0 }
#define HOLD(k, n)  { k, n, 0, 0 }
#define P(k)        { k, 3, 0, 0 }, { 0, 6, 0, 0 }
#define SNAP(id)    { 0, 1, OP_SNAP, id }
#define MASH        { 0, 1, OP_MASH, 0 }   /* A finché non si torna a camminare nel mondo */
#define WARP(m, x, y) { m, 1, OP_WARP, x, y }, W(60)
#define LEVEL(n)    { 0, 1, OP_LEVEL, n }
#define A10         P(KEY_A), W(34), P(KEY_A), W(34), P(KEY_A), W(34), P(KEY_A), W(34), P(KEY_A), W(34), P(KEY_A), W(34), P(KEY_A), W(34), P(KEY_A), W(34), P(KEY_A), W(34), P(KEY_A), W(34)

static const TStep SCRIPT[] = {
  W(100), SNAP(1),                                   // titolo
  P(KEY_START), W(30), SNAP(2),                      // menu del titolo
  P(KEY_A), W(20), SNAP(3),                          // scelta dell'eroe (Ste)
  P(KEY_RIGHT), W(12), SNAP(4),                      // Riki evidenziato
  P(KEY_LEFT), W(6), P(KEY_A), W(150), SNAP(5),      // si parte con Ste: dialogo d'apertura del Rettore
  MASH, W(30), SNAP(6),                              // aula magna dopo l'intro
  HOLD(KEY_DOWN, 36), W(80), SNAP(7),                // uscita: Varese
  HOLD(KEY_DOWN, 64), W(10), SNAP(8),                // camminata in città
  P(KEY_START), W(24), SNAP(9),                      // menu di pausa
  P(KEY_B), W(30),
  { 0, 1, OP_FORCE, 0 }, HOLD(KEY_UP, 17), W(140), SNAP(10),     // battaglia forzata
  P(KEY_A), W(12), SNAP(11),                         // scelta del bersaglio
  P(KEY_A), W(12), P(KEY_A), W(12), P(KEY_A), W(260), SNAP(12),  // Ste e Riki attaccano
  MASH, W(40), SNAP(13),                             // fino alla vittoria e ritorno in città
  // salvataggio dal menu di pausa
  P(KEY_START), W(20), P(KEY_DOWN), P(KEY_DOWN), P(KEY_DOWN), P(KEY_DOWN), P(KEY_A), W(30), P(KEY_A), W(20), P(KEY_B), W(30), SNAP(14),
  // negozio di Varese: davanti al bancone, si compra la prima cosa (Pozione)
  WARP(MAP_NEGOZIO_VARESE, 3, 5), HOLD(KEY_UP, 2), W(10), P(KEY_A), W(60), P(KEY_A), W(30), SNAP(15), P(KEY_A), W(40), P(KEY_A), W(30), P(KEY_B), W(40), SNAP(16),
  // Vedano: la squadra cresce e affronta il Guardiano del Lazzaretto
  LEVEL(16), WARP(MAP_VEDANO, 2, 12), HOLD(KEY_UP, 18), W(30), SNAP(17), MASH, W(30), SNAP(18),
  // una missione (i lupi dell'Olona) e il forziere del parco
  WARP(MAP_VEDANO, 16, 13), HOLD(KEY_UP, 2), W(10), P(KEY_A), W(20), MASH, W(20), SNAP(23),
  WARP(MAP_VEDANO, 23, 8), HOLD(KEY_UP, 2), W(10), P(KEY_A), W(40), SNAP(24), MASH,
  // la mappa del mondo
  WARP(MAP_WORLD, 24, 10), HOLD(KEY_RIGHT, 40), W(20), SNAP(25),
  // Castiglione: la Collegiata, poi tre nuovi compagni
  WARP(MAP_CASTIGLIONE, 22, 4), HOLD(KEY_UP, 18), W(30), MASH, W(30), SNAP(19),
  // Jerago e Samarate, poi il Sacro Monte: Eterna e il finale (che nella ROM di prova si ferma)
  LEVEL(30), WARP(MAP_JERAGO, 9, 4), HOLD(KEY_UP, 18), W(30), MASH, W(30), SNAP(20),
  WARP(MAP_SAMARATE, 18, 5), HOLD(KEY_UP, 18), W(30), MASH, W(30), SNAP(21),
  LEVEL(45), WARP(MAP_SACROMONTE, 8, 3), HOLD(KEY_UP, 18), W(30), SNAP(22), MASH,
  { 0, 1, OP_DONE, 0 },
};

void autotestKeys(u16 *held){
  static u32 i, left; static int started;
  if (!started){ started = 1; left = SCRIPT[0].frames; }
  if (i >= sizeof SCRIPT / sizeof SCRIPT[0]){ *held = 0; return; }
  const TStep *s = &SCRIPT[i];
  if (s->op == OP_MASH){
    // un tocco di A ogni volta che un testo o un menu aspetta; fine quando il mondo è fermo da un po'
    static u32 t0; if (!t0) t0 = frameCount;
    *held = (testWaiting + 1 >= frameCount && (frameCount & 7) < 2) ? KEY_A : 0;
    if ((testWorldIdle + 1 >= frameCount && frameCount - t0 > 30 && testWaiting + 20 < frameCount) || frameCount - t0 > 60 * 90){ t0 = 0; i++; if (i < sizeof SCRIPT / sizeof SCRIPT[0]) left = SCRIPT[i].frames; }
    return;
  }
  if (left == s->frames){
    if (s->op == OP_SNAP) testSnap(s->arg);
    if (s->op == OP_DONE) testDone();
    if (s->op == OP_FORCE) testForceBattle = 1;
    if (s->op == OP_WARP){ testWarpX = s->arg; testWarpY = s->arg2; testWarpMap = s->keys; }
    if (s->op == OP_LEVEL) for (int c = 0; c < 8; c++) if (G.joined & (1 << c)){ G.ch[c].level = s->arg; fullHeal(); }
  }
  *held = s->op ? 0 : s->keys;
  if (--left == 0){ i++; if (i < sizeof SCRIPT / sizeof SCRIPT[0]) left = SCRIPT[i].frames; }
}
#endif
