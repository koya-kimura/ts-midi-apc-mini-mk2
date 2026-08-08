import type {
  MidiBindingConfig,
  MidiRandomBinding,
  MidiSequenceBinding,
  MidiStateBinding,
  RegisteredMidiCell,
} from "../core/MidiConfig";

export type BuildBindingRegistryResult<TKey extends string, TLedColor extends string> = {
  cellRegistry: Map<number, RegisteredMidiCell<TKey, TLedColor>>;
  gridValues: Map<TKey, boolean | number>;
  sequenceSteps: Map<TKey, boolean[]>;
};

type BuildBindingRegistryArgs<TKey extends string, TLedColor extends string> = {
  mapping: MidiBindingConfig<TKey, TLedColor>[];
  getCellKey: (page: number, row: number, col: number) => number;
  resolveLedColors: (inactiveLedColor?: TLedColor, activeLedColor?: TLedColor) => { inactiveLedColor: TLedColor; activeLedColor: TLedColor };
};

type ValidatedStateConfig<TLedColor extends string> = {
  cycleLength: number;
  defaultValue: number;
  stateLedColors?: TLedColor[];
};

type ValidatedRandomConfig<TKey extends string> = {
  radioKey: TKey;
  defaultValue: boolean;
};

export function buildBindingRegistry<TKey extends string, TLedColor extends string>(
  args: BuildBindingRegistryArgs<TKey, TLedColor>,
): BuildBindingRegistryResult<TKey, TLedColor> {
  const { mapping, getCellKey, resolveLedColors } = args;
  const randomAssignedRadioKeys = new Set<TKey>();
  const cellRegistry = new Map<number, RegisteredMidiCell<TKey, TLedColor>>();
  const gridValues = new Map<TKey, boolean | number>();
  const sequenceSteps = new Map<TKey, boolean[]>();

  for (const buttonConfig of mapping) {
    const validatedStateConfig =
      buttonConfig.type === "state" ? validateStateBinding(buttonConfig as MidiStateBinding<TKey, TLedColor>) : null;
    const validatedRandomConfig =
      buttonConfig.type === "random"
        ? validateRandomBinding(buttonConfig as MidiRandomBinding<TKey, TLedColor>, randomAssignedRadioKeys, mapping)
        : null;

    if (buttonConfig.type === "random" && !validatedRandomConfig) {
      continue;
    }

    const targets = buttonConfig.targets;

    for (let i = 0; i < targets.length; i++) {
      const cell = targets[i];
      const page = cell.page ?? 0;
      const cellKey = getCellKey(page, cell.row, cell.col);

      if (cellRegistry.has(cellKey)) {
        console.error(`Cell (page=${page}, row=${cell.row}, col=${cell.col}) is duplicated.`);
        continue;
      }

      const ledColors = resolveLedColors(buttonConfig.inactiveLedColor, buttonConfig.activeLedColor);

      const registeredCell: RegisteredMidiCell<TKey, TLedColor> = {
        key: buttonConfig.key,
        type: buttonConfig.type,
        index: i,
        inactiveLedColor: ledColors.inactiveLedColor,
        activeLedColor: ledColors.activeLedColor,
        stateLedColors: validatedStateConfig?.stateLedColors,
        randomRadioKey: validatedRandomConfig?.radioKey,
        currentStepLedColor:
          buttonConfig.type === "sequence" ? (buttonConfig as MidiSequenceBinding<TKey, TLedColor>).currentStepLedColor : undefined,
      };

      cellRegistry.set(cellKey, registeredCell);
    }

    if (buttonConfig.type === "state") {
      if (!validatedStateConfig) {
        continue;
      }

      gridValues.set(buttonConfig.key, validatedStateConfig.defaultValue);
    } else if (buttonConfig.type === "sequence") {
      const sequenceConfig = buttonConfig as MidiSequenceBinding<TKey, TLedColor>;
      sequenceSteps.set(buttonConfig.key, [...sequenceConfig.defaultSteps]);
    } else if (buttonConfig.type === "random") {
      if (!validatedRandomConfig) {
        continue;
      }

      gridValues.set(buttonConfig.key, validatedRandomConfig.defaultValue);
    } else {
      gridValues.set(buttonConfig.key, buttonConfig.defaultValue);
    }
  }

  return {
    cellRegistry,
    gridValues,
    sequenceSteps,
  };
}

export function getRadioTargetCount<TKey extends string, TLedColor extends string>(
  mapping: MidiBindingConfig<TKey, TLedColor>[],
  radioKey: TKey,
): number {
  for (const buttonConfig of mapping) {
    if (buttonConfig.key === radioKey && buttonConfig.type === "radio") {
      return buttonConfig.targets.length;
    }
  }

  return 0;
}

export function getStateCycleLength<TKey extends string, TLedColor extends string>(
  mapping: MidiBindingConfig<TKey, TLedColor>[],
  stateKey: TKey,
): number {
  for (const buttonConfig of mapping) {
    if (buttonConfig.key === stateKey && buttonConfig.type === "state") {
      return buttonConfig.cycleLength;
    }
  }

  return 1;
}

function validateStateBinding<TKey extends string, TLedColor extends string>(
  config: MidiStateBinding<TKey, TLedColor>,
): ValidatedStateConfig<TLedColor> {
  const issues: string[] = [];

  const hasValidCycleLength = Number.isInteger(config.cycleLength) && config.cycleLength > 0;
  const cycleLength = hasValidCycleLength ? config.cycleLength : 1;
  if (!hasValidCycleLength) {
    issues.push(`cycleLength must be a positive integer, got ${config.cycleLength}`);
  }

  const hasValidDefaultValue =
    Number.isInteger(config.defaultValue) && config.defaultValue >= 0 && config.defaultValue < cycleLength;
  const defaultValue = hasValidDefaultValue ? config.defaultValue : 0;
  if (!hasValidDefaultValue) {
    issues.push(`defaultValue must be in range [0, ${cycleLength - 1}], got ${config.defaultValue}`);
  }

  let stateLedColors = config.stateLedColors;
  if (stateLedColors && stateLedColors.length !== cycleLength) {
    issues.push(`stateLedColors length (${stateLedColors.length}) must match cycleLength (${cycleLength})`);
    stateLedColors = undefined;
  }

  if (issues.length > 0) {
    const message = `[APCMiniMK2] Invalid state config for key '${config.key}': ${issues.join("; ")}`;
    console.error(message);
  }

  return {
    cycleLength,
    defaultValue,
    stateLedColors,
  };
}

function validateRandomBinding<TKey extends string, TLedColor extends string>(
  config: MidiRandomBinding<TKey, TLedColor>,
  randomAssignedRadioKeys: Set<TKey>,
  mapping: MidiBindingConfig<TKey, TLedColor>[],
): ValidatedRandomConfig<TKey> | null {
  const issues: string[] = [];

  const radioTargetCount = getRadioTargetCount(mapping, config.radioKey);
  if (!radioTargetCount || radioTargetCount <= 0) {
    issues.push(`radioKey '${config.radioKey}' is not a valid radio binding`);
  }

  if (randomAssignedRadioKeys.has(config.radioKey)) {
    issues.push(`radioKey '${config.radioKey}' is already assigned by another random binding`);
  }

  if (issues.length > 0) {
    const message = `[APCMiniMK2] Invalid random config for key '${config.key}': ${issues.join("; ")}`;
    console.error(message);
    return null;
  }

  randomAssignedRadioKeys.add(config.radioKey);

  return {
    radioKey: config.radioKey,
    defaultValue: Boolean(config.defaultValue),
  };
}
