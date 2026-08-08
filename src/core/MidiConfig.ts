// Inlined from InputConfig.ts - types needed for MIDI cell registration
export type InputType = "radio" | "toggle" | "oneshot" | "momentary" | "state" | "sequence" | "random";

export interface RegisteredInputBinding<TKey = string> {
  key: TKey;
  type: InputType;
  index: number;
}

// MIDI binding configuration types

export interface CellPosition {
  page?: number;
  row: number;
  col: number;
}

export interface MidiLedColorConfig<TLedColor = string> {
  inactiveLedColor?: TLedColor;
  activeLedColor?: TLedColor;
}

export interface ResolvedMidiLedColorConfig<TLedColor = string> {
  inactiveLedColor: TLedColor;
  activeLedColor: TLedColor;
}

export interface MidiBindingBase<TKey = string, TLedColor = string> extends MidiLedColorConfig<TLedColor> {
  key: TKey;
  targets: CellPosition[];
}

export interface MidiToggleBinding<TKey = string, TLedColor = string> extends MidiBindingBase<TKey, TLedColor> {
  type: "toggle";
  defaultValue: boolean;
}

export interface MidiRadioBinding<TKey = string, TLedColor = string> extends MidiBindingBase<TKey, TLedColor> {
  type: "radio";
  defaultValue: number;
}

export interface MidiOneshotBinding<TKey = string, TLedColor = string> extends MidiBindingBase<TKey, TLedColor> {
  type: "oneshot";
  defaultValue: boolean;
}

export interface MidiMomentaryBinding<TKey = string, TLedColor = string> extends MidiBindingBase<TKey, TLedColor> {
  type: "momentary";
  defaultValue: boolean;
}

export interface MidiStateBinding<TKey = string, TLedColor = string> extends MidiBindingBase<TKey, TLedColor> {
  type: "state";
  cycleLength: number;
  defaultValue: number;
  stateLedColors?: TLedColor[];
}

export interface MidiSequenceBinding<TKey = string, TLedColor = string> extends MidiBindingBase<TKey, TLedColor> {
  type: "sequence";
  defaultSteps: boolean[];
  currentStepLedColor?: TLedColor;
}

export interface MidiRandomBinding<TKey = string, TLedColor = string> extends MidiBindingBase<TKey, TLedColor> {
  type: "random";
  defaultValue: boolean;
  radioKey: TKey;
}

export type MidiBindingConfig<TKey = string, TLedColor = string> =
  | MidiToggleBinding<TKey, TLedColor>
  | MidiRadioBinding<TKey, TLedColor>
  | MidiOneshotBinding<TKey, TLedColor>
  | MidiMomentaryBinding<TKey, TLedColor>
  | MidiStateBinding<TKey, TLedColor>
  | MidiSequenceBinding<TKey, TLedColor>
  | MidiRandomBinding<TKey, TLedColor>;

export type RegisteredMidiCell<TKey = string, TLedColor = string> = RegisteredInputBinding<TKey> &
  ResolvedMidiLedColorConfig<TLedColor> & {
    currentStepLedColor?: TLedColor;
    stateLedColors?: TLedColor[];
    randomRadioKey?: TKey;
  };
