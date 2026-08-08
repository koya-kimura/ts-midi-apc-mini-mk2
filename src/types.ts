import type { MidiBindingConfig } from "./core/MidiConfig";
import type { LedColorType } from "./core/LedPalette";

export type FaderButtonFunction = "random" | "mute";
export type FaderButtonMode = "normal" | "random" | "mute";

export interface APCMiniMK2Options<TKey extends string = string> {
  /** Grid mapping configuration */
  mapping: MidiBindingConfig<TKey, LedColorType>[];
  /** Per-fader button function assignment (length must be 9) */
  faderButtonFunctions?: FaderButtonFunction[];
}

export interface APCMiniMK2Controller<TKey extends string = string> {
  /** Initialize WebMIDI connection */
  init(): Promise<void>;
  /** Release MIDI event handlers and output references */
  destroy(): void;
  /** Update state with current beat position */
  update(beat: number): void;
  /** Whether MIDI device was successfully connected */
  readonly midiSuccess: boolean;

  /** Get fader value (0-1) at index, respecting mute/random mode */
  faderValue(index: number): number;

  /** Get boolean value for toggle/oneshot/momentary/random keys */
  booleanValue(key: TKey): boolean;
  /** Get selected radio index */
  radioValue(key: TKey): number;
  /** Get current state value (cycle index) */
  stateValue(key: TKey): number;
  /** Check if sequence step is active at current beat */
  sequenceActive(key: TKey): boolean;
}
