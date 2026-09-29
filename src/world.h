#pragma once
#include "data.h"

enum { DIR_DOWN, DIR_UP, DIR_LEFT, DIR_RIGHT };
void worldLoad(int map, int x, int y, int dir);   // carica mappa, sprite, musica (senza dissolvenza)
void worldRun(void);                              // ciclo dell'esplorazione (non esce mai: le scene si chiamano da qui)
void worldRedraw(void);                           // ridisegna mappa e sprite dopo una battaglia o un menu
void worldDrawActors(void);
void worldWarp(int map, int x, int y);            // cambio mappa con dissolvenza
extern const MapDef *curMap;
