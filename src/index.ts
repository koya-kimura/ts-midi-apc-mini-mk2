// Factory
export { createController } from "./createController";

// Public types
export type {
  APCMiniMK2Controller,
  APCMiniMK2Options,
  FaderButtonMode,
  FaderButtonFunction,
} from "./types";

// Mapping definition types
export type {
  MidiBindingConfig,
  MidiToggleBinding,
  MidiRadioBinding,
  MidiOneshotBinding,
  MidiMomentaryBinding,
  MidiStateBinding,
  MidiSequenceBinding,
  MidiRandomBinding,
  CellPosition,
} from "./core/MidiConfig";

// LED color
export { LED_COLOR } from "./core/LedPalette";
export type { LedColorType } from "./core/LedPalette";
