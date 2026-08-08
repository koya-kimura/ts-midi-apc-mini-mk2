import type { RegisteredMidiCell } from "../core/MidiConfig";
import { APC_MINI_MK2_PALETTE, type APCMiniLedColorKey } from "./APCMiniMK2Palette";
import { getCellKey } from "./APCMiniMK2LayoutMap";
import type { FaderButtonMode } from "../types";

type GridPadVelocityArgs<TKey extends string> = {
  page: number;
  row: number;
  col: number;
  cellRegistry: ReadonlyMap<number, RegisteredMidiCell<TKey, APCMiniLedColorKey>>;
  gridValues: ReadonlyMap<TKey, boolean | number>;
  sequenceSteps: ReadonlyMap<TKey, boolean[]>;
  currentBeat: number;
};

export function getSideButtonLedColor(index: number, currentPageIndex: number): number {
  return index === currentPageIndex ? APC_MINI_MK2_PALETTE.GREEN : APC_MINI_MK2_PALETTE.OFF;
}

export function getFaderButtonLedColor(
  mode: FaderButtonMode,
  modeColors: Readonly<Record<FaderButtonMode, APCMiniLedColorKey>>,
): number {
  const colorKey = modeColors[mode];
  return APC_MINI_MK2_PALETTE[colorKey];
}

export function getGridPadVelocity<TKey extends string>(args: GridPadVelocityArgs<TKey>): number {
  const { page, row, col, cellRegistry, gridValues, sequenceSteps, currentBeat } = args;
  const cellKey = getCellKey(page, row, col);
  const registeredCell = cellRegistry.get(cellKey);

  if (!registeredCell) {
    return APC_MINI_MK2_PALETTE.OFF;
  }

  let color = APC_MINI_MK2_PALETTE[registeredCell.inactiveLedColor];

  switch (registeredCell.type) {
    case "radio":
      color =
        gridValues.get(registeredCell.key) === registeredCell.index
          ? APC_MINI_MK2_PALETTE[registeredCell.activeLedColor]
          : APC_MINI_MK2_PALETTE[registeredCell.inactiveLedColor];
      break;
    case "toggle":
    case "oneshot":
    case "momentary":
    case "random":
      color = gridValues.get(registeredCell.key)
        ? APC_MINI_MK2_PALETTE[registeredCell.activeLedColor]
        : APC_MINI_MK2_PALETTE[registeredCell.inactiveLedColor];
      break;
    case "state": {
      const value = gridValues.get(registeredCell.key);
      const stateValue = typeof value === "number" ? value : 0;
      const stateColorKey = registeredCell.stateLedColors?.[stateValue];

      if (stateColorKey) {
        color = APC_MINI_MK2_PALETTE[stateColorKey];
      } else {
        color =
          stateValue !== 0
            ? APC_MINI_MK2_PALETTE[registeredCell.activeLedColor]
            : APC_MINI_MK2_PALETTE[registeredCell.inactiveLedColor];
      }
      break;
    }
    case "sequence": {
      const steps = sequenceSteps.get(registeredCell.key);
      if (steps && registeredCell.index < steps.length) {
        const isEnabled = steps[registeredCell.index];
        const currentIndex = Math.floor(currentBeat) % steps.length;
        const isCurrent = registeredCell.index === currentIndex;
        const currentStepColor = registeredCell.currentStepLedColor ?? registeredCell.activeLedColor;

        if (isCurrent) {
          color = APC_MINI_MK2_PALETTE[currentStepColor];
        } else if (isEnabled) {
          color = APC_MINI_MK2_PALETTE[registeredCell.activeLedColor];
        } else {
          color = APC_MINI_MK2_PALETTE[registeredCell.inactiveLedColor];
        }
      }
      break;
    }
  }

  return color;
}
