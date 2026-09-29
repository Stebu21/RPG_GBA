@ Avvio della cartuccia: intestazione, copia dei dati in IWRAM, azzeramento del BSS, main().
    .section .crt0, "ax"
    .global _start
    .arm
_start:
    b       start_vector
    @ logo di 156 byte: il BIOS originale lo verifica; qui resta a zero (gli emulatori con BIOS
    @ di alto livello, come mGBA, non lo controllano). Per le flash-cart va inserito con un gbafix.
    .fill   156, 1, 0
    .ascii  "MENACEETERNA"           @ titolo (12 caratteri)
    .ascii  "BMEI"                   @ codice gioco
    .ascii  "01"                     @ editore
    .byte   0x96                     @ valore fisso
    .byte   0x00                     @ unità principale
    .byte   0x00                     @ tipo di dispositivo
    .fill   7, 1, 0
    .byte   0x00                     @ versione
    .byte   0x00                     @ checksum dell'intestazione (calcolato da tools/build.mjs)
    .fill   2, 1, 0

start_vector:
    mov     r0, #0x12                @ modalità IRQ: stack dedicato
    msr     cpsr_c, r0
    ldr     sp, =0x03007FA0
    mov     r0, #0x1F                @ modalità di sistema: stack principale
    msr     cpsr_c, r0
    ldr     sp, =0x03007F00

    @ .data da ROM a IWRAM
    ldr     r0, =__data_lma
    ldr     r1, =__data_start
    ldr     r2, =__data_end
1:  cmp     r1, r2
    ldrlo   r3, [r0], #4
    strlo   r3, [r1], #4
    blo     1b
    @ .iwram (codice veloce) da ROM a IWRAM
    ldr     r0, =__iwram_lma
    ldr     r1, =__iwram_start
    ldr     r2, =__iwram_end
2:  cmp     r1, r2
    ldrlo   r3, [r0], #4
    strlo   r3, [r1], #4
    blo     2b
    @ .bss e .ewram a zero
    mov     r3, #0
    ldr     r1, =__bss_start
    ldr     r2, =__bss_end
3:  cmp     r1, r2
    strlo   r3, [r1], #4
    blo     3b
    ldr     r1, =__ewram_start
    ldr     r2, =__ewram_end
4:  cmp     r1, r2
    strlo   r3, [r1], #4
    blo     4b

    ldr     r0, =main
    bx      r0

    @ stringa che dice agli emulatori che la cartuccia ha 32 KB di SRAM a batteria
    .align 2
    .ascii  "SRAM_V113"
    .align 2
