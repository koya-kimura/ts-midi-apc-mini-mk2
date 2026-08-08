import { APC_MINI_MK2_HARDWARE_CONFIG as HARDWARE_CONFIG, APC_MINI_MK2_NOTE_RANGES as NOTE_RANGES } from "./APCMiniMK2Constants";

export function getCellKey(page: number, row: number, col: number): number {
  return page * (HARDWARE_CONFIG.GRID_SIZE * HARDWARE_CONFIG.GRID_SIZE) + row * HARDWARE_CONFIG.GRID_SIZE + col;
}

export function getGridCoordinateFromNote(note: number): { row: number; col: number } {
  const gridIndex = note - NOTE_RANGES.GRID.START;
  const col = gridIndex % HARDWARE_CONFIG.GRID_SIZE;
  const hardwareRow = Math.floor(gridIndex / HARDWARE_CONFIG.GRID_SIZE);
  const softwareRow = HARDWARE_CONFIG.GRID_SIZE - 1 - hardwareRow;

  return { row: softwareRow, col };
}

export function getNoteFromGridCoordinate(row: number, col: number): number {
  const hardwareRow = HARDWARE_CONFIG.GRID_SIZE - 1 - row;
  const gridIndex = hardwareRow * HARDWARE_CONFIG.GRID_SIZE + col;

  return NOTE_RANGES.GRID.START + gridIndex;
}

export function getFaderButtonIndex(note: number): number {
  if (note >= NOTE_RANGES.FADER_BUTTONS.START && note <= NOTE_RANGES.FADER_BUTTONS.END) {
    return note - NOTE_RANGES.FADER_BUTTONS.START;
  }

  if (note === NOTE_RANGES.SHIFT_BUTTON) {
    return HARDWARE_CONFIG.FADER_BUTTON_COUNT - 1;
  }

  return -1;
}
