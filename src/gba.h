// Registri e tipi del Game Boy Advance (solo quello che serve al gioco).
#pragma once
#include <stdint.h>

typedef uint8_t u8; typedef uint16_t u16; typedef uint32_t u32;
typedef int8_t s8; typedef int16_t s16; typedef int32_t s32;
#define REG16(a) (*(volatile u16*)(a))
#define REG32(a) (*(volatile u32*)(a))

#define REG_DISPCNT   REG16(0x04000000)
#define REG_DISPSTAT  REG16(0x04000004)
#define REG_VCOUNT    REG16(0x04000006)
#define REG_BGCNT(n)  REG16(0x04000008 + (n) * 2)
#define REG_BGHOFS_HW(n) REG16(0x04000010 + (n) * 4)
#define REG_BGVOFS_HW(n) REG16(0x04000012 + (n) * 4)
#define REG_WIN0H     REG16(0x04000040)
#define REG_WIN0V     REG16(0x04000044)
#define REG_WININ     REG16(0x04000048)
#define REG_WINOUT    REG16(0x0400004A)
#define REG_MOSAIC    REG16(0x0400004C)
#define REG_BLDCNT    REG16(0x04000050)
#define REG_BLDALPHA  REG16(0x04000052)
#define REG_BLDY_HW   REG16(0x04000054)
#define REG_KEYINPUT  REG16(0x04000130)
#define REG_IE        REG16(0x04000200)
#define REG_IF        REG16(0x04000202)
#define REG_WAITCNT   REG16(0x04000204)
#define REG_IME       REG16(0x04000208)
#define REG_IFBIOS    REG16(0x03007FF8)
#define REG_ISR_MAIN  (*(void(**)(void))0x03007FFC)

// suono
#define REG_SOUND1CNT_L REG16(0x04000060)
#define REG_SOUND1CNT_H REG16(0x04000062)
#define REG_SOUND1CNT_X REG16(0x04000064)
#define REG_SOUND2CNT_L REG16(0x04000068)
#define REG_SOUND2CNT_H REG16(0x0400006C)
#define REG_SOUND4CNT_L REG16(0x04000078)
#define REG_SOUND4CNT_H REG16(0x0400007C)
#define REG_SOUNDCNT_L  REG16(0x04000080)
#define REG_SOUNDCNT_H  REG16(0x04000082)
#define REG_SOUNDCNT_X  REG16(0x04000084)

#define MEM_PAL_BG   ((u16*)0x05000000)
#define MEM_PAL_OBJ  ((u16*)0x05000200)
#define MEM_VRAM     ((u16*)0x06000000)
#define MEM_OAM      ((u16*)0x07000000)
#define MEM_SRAM     ((volatile u8*)0x0E000000)
#define CHARBLOCK(n) ((u16*)(0x06000000 + (n) * 0x4000))
#define SCREENBLOCK(n) ((u16*)(0x06000000 + (n) * 0x800))
#define OBJ_TILES    ((u16*)0x06010000)

#define DCNT_MODE0 0x0000
#define DCNT_OBJ_1D 0x0040
#define DCNT_BG(n) (0x0100 << (n))
#define DCNT_OBJ 0x1000
#define DCNT_WIN0 0x2000

#define KEY_A 0x0001
#define KEY_B 0x0002
#define KEY_SELECT 0x0004
#define KEY_START 0x0008
#define KEY_RIGHT 0x0010
#define KEY_LEFT 0x0020
#define KEY_UP 0x0040
#define KEY_DOWN 0x0080
#define KEY_R 0x0100
#define KEY_L 0x0200

#define RGB15(r, g, b) ((u16)((r) | ((g) << 5) | ((b) << 10)))

typedef struct { u16 a0, a1, a2, fill; } OamEntry;
#define OAM ((volatile OamEntry*)0x07000000)

// copia veloce a parole (VRAM accetta solo scritture a 16/32 bit)
static inline void memcpy16(void *dst, const void *src, u32 halfwords){
  volatile u16 *d = dst; const u16 *s = src;
  while (halfwords--) *d++ = *s++;
}
static inline void memset16(void *dst, u16 v, u32 halfwords){
  volatile u16 *d = dst;
  while (halfwords--) *d++ = v;
}

// i registri di scorrimento e BLDY sono in sola scrittura: se ne tiene una copia in RAM
extern volatile u16 ioShadow[9];   // HOFS/VOFS di BG0-3, poi BLDY
static inline void setScroll(int n, int x, int y){ ioShadow[n * 2] = x; ioShadow[n * 2 + 1] = y; REG_BGHOFS_HW(n) = x; REG_BGVOFS_HW(n) = y; }
static inline void setBldy(int v){ ioShadow[8] = v; REG_BLDY_HW = v; }
