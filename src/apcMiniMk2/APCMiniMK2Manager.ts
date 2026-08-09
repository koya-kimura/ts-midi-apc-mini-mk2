import { MidiManagerBase } from "../core/MidiManagerBase";
import type { MidiBindingConfig, RegisteredMidiCell } from "../core/MidiConfig";
import { APC_MINI_MK2_PALETTE, type APCMiniLedColorKey } from "./APCMiniMK2Palette";
import type { APCMiniMK2Options, FaderButtonFunction, FaderButtonMode } from "../types";
import { buildBindingRegistry, getRadioTargetCount, getStateCycleLength } from "./APCMiniMK2BindingRegistry";
import {
  APC_MINI_MK2_HARDWARE_CONFIG as HARDWARE_CONFIG,
  APC_MINI_MK2_NOTE_RANGES as NOTE_RANGES,
  APC_MINI_MK2_GRID_LED_NOTE_ON_STATUS as GRID_LED_NOTE_ON_STATUS,
} from "./APCMiniMK2Constants";
import { getCellKey, getFaderButtonIndex, getGridCoordinateFromNote, getNoteFromGridCoordinate } from "./APCMiniMK2LayoutMap";
import { getFaderButtonLedColor, getGridPadVelocity, getSideButtonLedColor } from "./APCMiniMK2LedRenderer";
import { LED_COLOR } from "../core/LedPalette";
import type { LedColorType } from "../core/LedPalette";
import { Pcg01 } from "../utils/pcg";

const DEFAULT_DEVICE_NAME = "APC mini mk2 Control";

const DEFAULT_FADER_BUTTON_FUNCTIONS: FaderButtonFunction[] = [
  "mute",
  "random",
  "mute",
  "random",
  "mute",
  "random",
  "mute",
  "random",
  "mute",
];

export class APCMiniMK2Manager<TKey extends string = string> extends MidiManagerBase {
  private static readonly DEFAULT_INACTIVE_LED_COLOR = LED_COLOR.OFF;
  private static readonly DEFAULT_ACTIVE_LED_COLOR = LED_COLOR.GREEN;

  private static readonly FADER_BUTTON_MODE_COLORS: Record<FaderButtonMode, APCMiniLedColorKey> = {
    normal: LED_COLOR.OFF,
    random: LED_COLOR.PINK,
    mute: LED_COLOR.RED,
  };

  private readonly _mapping: MidiBindingConfig<TKey, LedColorType>[];

  private _cellRegistry: Map<number, RegisteredMidiCell<TKey, APCMiniLedColorKey>> = new Map();
  private _gridValues: Map<TKey, boolean | number> = new Map();
  private _faderValues: number[] = new Array(HARDWARE_CONFIG.FADER_COUNT).fill(0);
  private _currentPageIndex = 0;
  private _ledsDirty = true;
  private _faderButtonModes: FaderButtonMode[] = new Array(HARDWARE_CONFIG.FADER_BUTTON_COUNT).fill(
    "normal",
  ) as FaderButtonMode[];
  private _faderButtonFunctions: FaderButtonFunction[];
  private _faderRandomValues: number[] = new Array(HARDWARE_CONFIG.FADER_COUNT).fill(0);
  private _momentaryActiveThisFrameKeys = new Set<TKey>();
  private _momentaryResetNextFrameKeys = new Set<TKey>();
  private _sequenceSteps = new Map<TKey, boolean[]>();
  private _currentBeat = 0;
  private _prevBeatIndex = -1;
  private _bindingsRegistered = false;

  constructor(options: APCMiniMK2Options<TKey>) {
    super(DEFAULT_DEVICE_NAME);
    this._mapping = options.mapping;

    const configuredFunctions = options.faderButtonFunctions;
    if (!configuredFunctions || configuredFunctions.length !== HARDWARE_CONFIG.FADER_BUTTON_COUNT) {
      if (configuredFunctions && configuredFunctions.length !== HARDWARE_CONFIG.FADER_BUTTON_COUNT) {
        console.error(
          `[APCMiniMK2] faderButtonFunctions length must be ${HARDWARE_CONFIG.FADER_BUTTON_COUNT}. Falling back to defaults.`,
        );
      }
      this._faderButtonFunctions = [...DEFAULT_FADER_BUTTON_FUNCTIONS];
      return;
    }

    this._faderButtonFunctions = configuredFunctions.map((mode) => (mode === "random" || mode === "mute" ? mode : "mute"));
  }

  public faderValue(index: number): number {
    if (index < 0 || index >= HARDWARE_CONFIG.FADER_COUNT) {
      return 0;
    }

    const mode = this._faderButtonModes[index];
    switch (mode) {
      case "mute":
        return 0;
      case "random":
        return this._faderRandomValues[index];
      case "normal":
      default:
        return this._faderValues[index];
    }
  }

  public radioValue(key: TKey): number {
    const value = this._gridValues.get(key);
    return typeof value === "number" ? value : 0;
  }

  public booleanValue(key: TKey): boolean {
    return Boolean(this._gridValues.get(key));
  }

  public stateValue(key: TKey): number {
    const value = this._gridValues.get(key);
    return typeof value === "number" ? value : 0;
  }

  public sequenceActive(key: TKey): boolean {
    const steps = this._sequenceSteps.get(key);
    if (!steps || steps.length === 0) {
      return false;
    }

    const currentIndex = Math.floor(this._currentBeat) % steps.length;
    return steps[currentIndex];
  }

  public override update(beat: number): void {
    this._currentBeat = beat;

    const currentBeatIndex = Math.floor(beat);
    if (currentBeatIndex !== this._prevBeatIndex) {
      this._prevBeatIndex = currentBeatIndex;

      this.updateRandomRoutersByBeat(currentBeatIndex);
      this.updateFaderRandomValues(currentBeatIndex);

      if (this._sequenceSteps.size > 0) {
        this._ledsDirty = true;
      }
    }

    this.flushMomentaryResetQueue();

    this.flushOutputIfNeeded();

    this.scheduleMomentaryReset();
  }

  protected onDeviceSetup(): void {
    if (!this._bindingsRegistered) {
      this.registerButtons();
      this._bindingsRegistered = true;
    }

    this._ledsDirty = true;
  }

  protected override onMidiAvailabilityChanged(available: boolean): void {
    if (!available) {
      return;
    }

    // Repaint current state right after a successful rebind.
    this._ledsDirty = true;
    this.flushOutputIfNeeded();
  }

  protected override onMidiOutputReady(): void {
    // Output can come back after input; force an immediate LED snapshot.
    this._ledsDirty = true;
    this.flushOutputIfNeeded();
  }

  protected processMidiMessage(status: number, data1: number, data2: number): void {
    this.processInputMessage(status, data1, data2);
  }

  protected override onDestroy(): void {
    this._cellRegistry.clear();
    this._gridValues.clear();
    this._sequenceSteps.clear();
    this._momentaryActiveThisFrameKeys.clear();
    this._momentaryResetNextFrameKeys.clear();
    this._faderValues.fill(0);
    this._faderRandomValues.fill(0);
    this._faderButtonModes.fill("normal");
    this._currentPageIndex = 0;
    this._currentBeat = 0;
    this._prevBeatIndex = -1;
    this._ledsDirty = false;
    this._bindingsRegistered = false;
  }

  private registerButtons(): void {
    const built = buildBindingRegistry<TKey, APCMiniLedColorKey>({
      mapping: this._mapping,
      getCellKey,
      resolveLedColors: (inactiveLedColor, activeLedColor) => this.resolveLedColors(inactiveLedColor, activeLedColor),
    });

    this._cellRegistry = built.cellRegistry;
    this._gridValues = built.gridValues;
    this._sequenceSteps = built.sequenceSteps;
  }

  private processInputMessage(status: number, data1: number, data2: number): void {
    if (status === MidiManagerBase.MIDI_STATUS.CONTROL_CHANGE) {
      this.handleFaderControlChange(data1, data2);
    } else if (status === MidiManagerBase.MIDI_STATUS.NOTE_OFF) {
      this.handleNoteOff(data1);
    } else if (status === MidiManagerBase.MIDI_STATUS.NOTE_ON) {
      this.handleNoteOn(data1, data2);
    }
  }

  private handleFaderControlChange(control: number, value: number): void {
    if (control >= NOTE_RANGES.FADERS.START && control <= NOTE_RANGES.FADERS.END) {
      const index = control - NOTE_RANGES.FADERS.START;
      this._faderValues[index] = value / MidiManagerBase.MIDI_MAX_VALUE;
    }
  }

  private handleNoteOn(note: number, velocity: number): void {
    if (velocity === 0) {
      this.handleNoteOff(note);
      return;
    }

    if (note >= NOTE_RANGES.SIDE_BUTTONS.START && note <= NOTE_RANGES.SIDE_BUTTONS.END) {
      this.processSideButton(note);
      return;
    }

    if (note >= NOTE_RANGES.GRID.START && note <= NOTE_RANGES.GRID.END) {
      this.processGridButton(note);
      return;
    }

    const faderIndex = getFaderButtonIndex(note);
    if (faderIndex !== -1) {
      this.processFaderButton(faderIndex);
    }
  }

  private handleNoteOff(note: number): void {
    if (note < NOTE_RANGES.GRID.START || note > NOTE_RANGES.GRID.END) {
      return;
    }

    const page = this._currentPageIndex;
    const { row, col } = getGridCoordinateFromNote(note);
    const cellKey = getCellKey(page, row, col);
    const registeredCell = this._cellRegistry.get(cellKey);

    if (!registeredCell) {
      return;
    }

    if (registeredCell.type === "oneshot") {
      this._gridValues.set(registeredCell.key, false);
      this._ledsDirty = true;
    }
  }

  private processSideButton(note: number): void {
    this._currentPageIndex = note - NOTE_RANGES.SIDE_BUTTONS.START;
    this._ledsDirty = true;
  }

  private processFaderButton(faderButtonIndex: number): void {
    const currentMode = this._faderButtonModes[faderButtonIndex];
    const targetMode = this._faderButtonFunctions[faderButtonIndex];
    this._faderButtonModes[faderButtonIndex] = currentMode === "normal" ? targetMode : "normal";
    this._ledsDirty = true;
  }

  private processGridButton(note: number): void {
    const page = this._currentPageIndex;
    const { row, col } = getGridCoordinateFromNote(note);
    const cellKey = getCellKey(page, row, col);
    const registeredCell = this._cellRegistry.get(cellKey);

    if (!registeredCell) {
      return;
    }

    const { key, type, index: cellIndex } = registeredCell;
    switch (type) {
      case "toggle":
        this._gridValues.set(key, !Boolean(this._gridValues.get(key)));
        break;
      case "radio":
        this._gridValues.set(key, cellIndex);
        break;
      case "oneshot":
        this._gridValues.set(key, true);
        break;
      case "momentary":
        this._gridValues.set(key, true);
        this._momentaryActiveThisFrameKeys.add(key);
        break;
      case "random":
        this._gridValues.set(key, !Boolean(this._gridValues.get(key)));
        break;
      case "state": {
        const cycleLength = getStateCycleLength(this._mapping, key);
        const currentValue = this.stateValue(key);
        this._gridValues.set(key, (currentValue + 1) % cycleLength);
        break;
      }
      case "sequence": {
        const steps = this._sequenceSteps.get(key);
        if (steps && cellIndex < steps.length) {
          steps[cellIndex] = !steps[cellIndex];
        }
        break;
      }
    }

    this._ledsDirty = true;
  }

  private flushOutputIfNeeded(): void {
    if (!this._ledsDirty) {
      return;
    }

    this.sendMidiOutput();
    this._ledsDirty = false;
  }

  private sendMidiOutput(): void {
    this.sendSideButtonLeds();
    this.sendFaderButtonLeds();
    this.sendGridPadLeds();
  }

  private sendSideButtonLeds(): void {
    for (let i = 0; i < HARDWARE_CONFIG.PAGE_BUTTON_COUNT; i++) {
      const note = NOTE_RANGES.SIDE_BUTTONS.START + i;
      const color = getSideButtonLedColor(i, this._currentPageIndex);
      this.sendNoteOn(note, color);
    }
  }

  private sendFaderButtonLeds(): void {
    for (let i = 0; i < HARDWARE_CONFIG.FADER_BUTTON_COUNT; i++) {
      const note = i < HARDWARE_CONFIG.FADER_BUTTON_COUNT - 1 ? NOTE_RANGES.FADER_BUTTONS.START + i : NOTE_RANGES.SHIFT_BUTTON;
      const mode = this._faderButtonModes[i];
      const color = getFaderButtonLedColor(mode, APCMiniMK2Manager.FADER_BUTTON_MODE_COLORS);
      this.sendNoteOn(note, color);
    }
  }

  private updateFaderRandomValues(beatIndex: number): void {
    for (let i = 0; i < HARDWARE_CONFIG.FADER_COUNT; i++) {
      if (this._faderButtonModes[i] !== "random") {
        continue;
      }

      const randomResult = Pcg01({ x: beatIndex + 1, y: i + 1000 });
      this._faderRandomValues[i] = randomResult.x < 0.5 ? 0 : 1;
    }
  }

  private sendGridPadLeds(): void {
    for (let col = 0; col < HARDWARE_CONFIG.GRID_SIZE; col++) {
      for (let row = 0; row < HARDWARE_CONFIG.GRID_SIZE; row++) {
        const note = getNoteFromGridCoordinate(row, col);
        const velocity = getGridPadVelocity<TKey>({
          page: this._currentPageIndex,
          row,
          col,
          cellRegistry: this._cellRegistry,
          gridValues: this._gridValues,
          sequenceSteps: this._sequenceSteps,
          currentBeat: this._currentBeat,
        });
        this.send(GRID_LED_NOTE_ON_STATUS, note, velocity);
      }
    }
  }

  private updateRandomRoutersByBeat(beatIndex: number): void {
    for (const buttonConfig of this._mapping) {
      if (buttonConfig.type !== "random") {
        continue;
      }

      const randomKey = buttonConfig.key;
      const radioKey = buttonConfig.radioKey;

      if (!this.booleanValue(randomKey)) {
        continue;
      }

      const radioLength = getRadioTargetCount(this._mapping, radioKey);
      if (radioLength <= 0) {
        continue;
      }

      const randomCell = buttonConfig.targets[0];
      const randomCellKey = getCellKey(randomCell.page ?? 0, randomCell.row, randomCell.col);
      const randomValue = Pcg01({
        x: beatIndex + 1,
        y: randomCellKey,
      }).x;

      let nextRadioIndex = Math.floor(randomValue * radioLength);
      if (nextRadioIndex >= radioLength) {
        nextRadioIndex = radioLength - 1;
      }

      if (this.radioValue(radioKey) !== nextRadioIndex) {
        this._gridValues.set(radioKey, nextRadioIndex);
        this._ledsDirty = true;
      }
    }
  }

  private resolveLedColors(
    inactiveLedColor?: APCMiniLedColorKey,
    activeLedColor?: APCMiniLedColorKey,
  ): { inactiveLedColor: APCMiniLedColorKey; activeLedColor: APCMiniLedColorKey } {
    return {
      inactiveLedColor: inactiveLedColor ?? APCMiniMK2Manager.DEFAULT_INACTIVE_LED_COLOR,
      activeLedColor: activeLedColor ?? APCMiniMK2Manager.DEFAULT_ACTIVE_LED_COLOR,
    };
  }

  private flushMomentaryResetQueue(): void {
    if (this._momentaryResetNextFrameKeys.size === 0) {
      return;
    }

    for (const key of this._momentaryResetNextFrameKeys) {
      this._gridValues.set(key, false);
    }

    this._momentaryResetNextFrameKeys.clear();
    this._ledsDirty = true;
  }

  private scheduleMomentaryReset(): void {
    if (this._momentaryActiveThisFrameKeys.size === 0) {
      return;
    }

    for (const key of this._momentaryActiveThisFrameKeys) {
      this._momentaryResetNextFrameKeys.add(key);
    }

    this._momentaryActiveThisFrameKeys.clear();
  }
}
