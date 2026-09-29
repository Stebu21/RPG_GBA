/* ROM a 0x08000000, variabili in IWRAM (32 KB veloci), buffer grandi in EWRAM (256 KB). */
OUTPUT_ARCH(arm)
ENTRY(_start)
MEMORY {
  rom   : ORIGIN = 0x08000000, LENGTH = 32M
  iwram : ORIGIN = 0x03000000, LENGTH = 31K
  ewram : ORIGIN = 0x02000000, LENGTH = 256K
}
SECTIONS {
  .text : {
    KEEP(*(.crt0))
    *(.text .text.*)
    *(.rodata .rodata.*)
    . = ALIGN(4);
  } > rom
  .ARM.exidx : { *(.ARM.exidx*) } > rom
  __data_lma = LOADADDR(.data);
  .data : { __data_start = .; *(.data .data.*) . = ALIGN(4); __data_end = .; } > iwram AT > rom
  __iwram_lma = LOADADDR(.iwram);
  .iwram : { __iwram_start = .; *(.iwram .iwram.*) . = ALIGN(4); __iwram_end = .; } > iwram AT > rom
  .bss (NOLOAD) : { __bss_start = .; *(.bss .bss.* COMMON) . = ALIGN(4); __bss_end = .; } > iwram
  .ewram (NOLOAD) : { __ewram_start = .; *(.ewram .ewram.*) . = ALIGN(4); __ewram_end = .; } > ewram
  /DISCARD/ : { *(.comment) *(.note*) }
}
