#pragma once
#include "data.h"
void scriptTrigger(const Trigger *t);   // NPC, missioni, forzieri, eventi, negozi, locande, cure
void scriptEnterEvents(void);           // eventi che partono entrando in una mappa
void runEvent(int ev);
void gameOver(void);
void registerKill(int mon);             // per le missioni "sconfiggi N mostri"
