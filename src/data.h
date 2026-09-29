// Strutture dei dati generati da tools/gen-assets.mjs (gen/*.c) a partire dal gioco web.
#pragma once
#include "gba.h"

// ---------- testo: stringhe codificate col set di caratteri del font (vedi gen) ----------
extern const u8 FONT_W[256];            // larghezza di ogni glifo
extern const u16 FONT_ROWS[256][9];     // 9 righe, bit 0 = colonna di sinistra

// ---------- mappe ----------
enum { T_PORTAL = 1, T_NPC, T_QUEST, T_CHEST, T_DOOREV, T_EVENT, T_SHOP, T_INN, T_HEAL, T_MOUNT };   // T_MOUNT: a = cavalcatura (1 asino, 2 cavallo)
typedef struct {
  u8 type, x, y, look;      // look: aspetto dello sprite (NPC, quest)
  u16 a, b;                 // PORTAL: a = mappa, b = x | y << 8; NPC: a = npc; QUEST: a = missione;
                            // CHEST: a = forziere (flag), b = oggetto | qty << 8; DOOREV/EVENT: a = evento;
                            // SHOP: a = negozio; INN: a = prezzo
  u8 need;                  // PORTAL: sigilli necessari
  u8 hide;                  // flag che nasconde il trigger (0xFF = nessuno)
} Trigger;
enum { MA_BLOCK = 1, MA_GRASS = 2, MA_WATER = 4 };
enum { MF_TOWN = 1, MF_INDOOR = 2, MF_WORLD = 4 };
typedef struct {
  const char *name;
  u8 w, h, music, zone, flags;          // zone: indice in ZONES o 0xFF
  const u16 *bg, *top;                  // voci di schermata (2w x 2h tile): terreno e livello sopra gli sprite (NULL = vuoto)
  const u8 *zones;                      // zona per casella (mappa del mondo), NULL = zone unica
  const u16 *tiles; u16 ntiles;         // grafica 4bpp (16 halfword per tile); dopo ntiles i secondi fotogrammi animati
  const u16 *pal; u8 npal;              // tavolozze BG 1..npal
  const u8 *attr;                       // attributi per casella
  const u16 *anim; u16 nanim;           // coppie (tile in VRAM, tile del 2° fotogramma in `tiles`)
  const Trigger *trig; u8 ntrig;
  u8 exitDir;                           // direzione del portale verso la mappa del mondo (per l'obiettivo)
} MapDef;
extern const MapDef MAPS[];
extern const u8 NUM_MAPS;
extern const u16 MOUNT_GFX[];          // [cavalcatura 0..1][passo 0..1][8 tile 32x16]
extern const u16 MOUNT_PAL[][16];
// mappa consultabile (menu START): immagine della provincia, casella del mondo di ogni luogo, paesi
// vista 0 = provincia, 1.. = piante dei paesi; pin in pixel dello schermo
typedef struct { u8 x, y; const char *name; } MapPin;
typedef struct { const char *name; const u16 *tiles; u16 ntiles; const u16 *map; const u16 *pal; u8 npal, ox, oy, scale; const MapPin *pins; u8 npins; } MapView;
extern const MapView VIEWS[]; extern const u8 NUM_VIEWS;
extern const u8 WORLD_POS[][2];         // casella della mappa del mondo di ogni luogo (255 = sconosciuta)
extern const u8 VIEW_POS[][3];          // vista e casella nella pianta (255,255 = la mappa stessa: si usa la posizione del giocatore)
extern const u16 BG_PALETTES[1][16];   // tavolozza dell'interfaccia

// ---------- personaggi e sprite ----------
typedef struct { const u16 *tiles; const u16 *pal; const u16 *big; } Look;   // 9 fotogrammi 16x32 (72 tile); eroi: 3 fotogrammi 32x64 (32 tile)
extern const Look LOOKS[];
extern const u8 NUM_LOOKS;
typedef struct { s16 hp, mp, atk, def, mag, spr, spd; } Stats;
typedef struct { u8 lv, ab; } Learn;
typedef struct {
  const char *name, *cls;
  Stats base; Stats growth10;           // crescita x10 per livello
  const Learn *learn; u8 nlearn;
  u8 look, limit;
  const u16 *portrait; const u16 *ppal; // ritratto 32x32
  const u16 *battle; const u16 *bpal;   // sprite di battaglia 32x32
} CharDef;
extern const CharDef CHARS[];
extern const u8 NUM_CHARS;

// ---------- abilità ----------
enum { AB_PHYS, AB_MAG, AB_HEAL, AB_HEALALL, AB_REVIVE, AB_BUFF, AB_STATUS, AB_STEAL };
enum { TG_ENEMY, TG_ENEMIES, TG_ALLY, TG_ALLIES, TG_SELF };
typedef struct { const char *name, *desc; u8 mp, type, target, element, hits, crit, limit; u8 power; u8 status, chance; u8 bstat, bmult10, bturns; } Ability;
extern const Ability ABILITIES[];
extern const u8 NUM_ABILITIES;
typedef struct { const char *name, *desc; u8 mpSte, mpRiki, power, element, target, hits, crit, lv; } Combo;
extern const Combo COMBOS[];
extern const u8 NUM_COMBOS;

// ---------- mostri ----------
typedef struct { const char *name; u8 type, power, element, target, w, status, chance; } Move;
typedef struct {
  const char *name; u8 level; u16 hp; u8 atk, def, mag, spr, spd; u16 exp, gold;
  u16 weak, resist;                     // maschere di elementi
  const Move *moves; u8 nmoves; u8 boss;
  const u16 *gfx; const u16 *pal;       // 64x64 (64 tile)
} Monster;
extern const Monster MONSTERS[];
extern const u8 NUM_MONSTERS;
typedef struct { const u8 *mon; u8 nmon, min, max, rate; u8 backdrop; } Zone;   // rate in 1/256 per passo
extern const Zone ZONES[];
extern const u8 NUM_ZONES;
typedef struct { const u16 *tiles; u16 ntiles; const u16 *map; const u16 *pal; u8 npal; } Backdrop;   // tavolozze BG 8..   // 30x20 tile
extern const Backdrop BACKDROPS[];

// ---------- oggetti, equipaggiamento, negozi ----------
enum { IT_HEAL, IT_FULL, IT_MP, IT_REVIVE, IT_CURE, IT_QUEST, IT_KEY, IT_EQUIP, IT_TOME };
typedef struct { const char *name, *desc; u16 price; u8 type; u16 power; u8 slot, who, ab; s8 atk, def, mag, spr, spd; s16 hp, mp; } Item;
extern const Item ITEMS[];
extern const u8 NUM_ITEMS;
typedef struct { const u8 *items; u8 n; } Shop;
extern const Shop SHOPS[];

// ---------- dialoghi, eventi, missioni ----------
typedef struct { const char *who; const char *text; } Line;
typedef struct { const u8 *has, *not; const Line *lines; u8 n; } NpcVariant;   // has/not: flag terminati da 0xFF
typedef struct { const NpcVariant *v; u8 n; } Npc;
extern const Npc NPCS[];
enum { S_DLG, S_FLAG, S_JOIN, S_BATTLE, S_ITEM, S_HEAL, S_ENDING };
typedef struct { u8 op, a; u16 b; const Line *lines; } Step;
typedef struct { u8 map, enter; const u8 *has, *not; const Step *steps; u8 n; const Step *done; u8 ndone; } Event;
extern const Event EVENTS[];
extern const u8 NUM_EVENTS;
enum { Q_KILL, Q_ITEM };
typedef struct {
  const char *name, *desc; u8 kind, target, need; u16 gold; u8 item, qty;
  const Line *offer, *accepted, *progress, *complete, *after; u8 noffer, naccepted, nprogress, ncomplete, nafter;
} Quest;
extern const Quest QUESTS[];
extern const u8 NUM_QUESTS;
extern const u8 NUM_FLAGS;
extern const char *const ELEMENT_NAMES[];

// obiettivo principale: flag da ottenere, mappa e casella della meta, descrizione
typedef struct { u8 flag, map, x, y; const char *label; } Goal;
extern const Goal GOALS[];
extern const u8 NUM_GOALS;

// ---------- musica ----------
typedef struct { const u8 *mel; u16 nmel; const u8 *bass; u16 nbass; u8 tempo, loop; } Song;   // coppie (nota MIDI o 0, durata in tick)
extern const Song SONGS[];

// ---------- interfaccia ----------
extern const u16 UI_TILES[]; extern const u16 UI_NTILES;
extern const u16 OBJ_UI_TILES[]; extern const u16 OBJ_UI_PAL[16];
extern const u16 TITLE_TILES[]; extern const u16 TITLE_NTILES; extern const u8 TITLE_NPAL; extern const u16 TITLE_MAP[]; extern const u16 TITLE_PAL[];   // tavolozze BG 8..

// indici fissi (generati)
#include "ids.h"
