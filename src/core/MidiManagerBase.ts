type MidiMessageEventLike = {
  data: Uint8Array | null;
};

type MidiInputLike = {
  name: string | null;
  onmidimessage: ((event: unknown) => void) | null;
};

type MidiOutputLike = {
  name: string | null;
  send: (data: number[]) => void;
};

type MidiPortMapLike<TPort> = {
  forEach: (callback: (value: TPort) => void) => void;
};

type MidiAccessLike = {
  inputs: MidiPortMapLike<MidiInputLike>;
  outputs: MidiPortMapLike<MidiOutputLike>;
};

export abstract class MidiManagerBase {
  protected readonly deviceName: string;

  protected static readonly MIDI_MAX_VALUE = 127;

  /** Input message status codes (literal types for exhaustive matching) */
  protected static readonly MIDI_STATUS = {
    NOTE_ON: 0x90,
    NOTE_OFF: 0x80,
    CONTROL_CHANGE: 0xb0,
  } as const;

  /** Output status codes (widened to number so subclasses can override the channel) */
  protected static readonly MIDI_OUTPUT_STATUS: {
    NOTE_ON: number;
    NOTE_OFF: number;
    CONTROL_CHANGE: number;
  } = {
    NOTE_ON: 0x90,
    NOTE_OFF: 0x80,
    CONTROL_CHANGE: 0xb0,
  };

  private _midiOutput: MidiOutputLike | null = null;
  private _midiInput: MidiInputLike | null = null;
  private _midiAccess: MidiAccessLike | null = null;
  private _midiSuccess = false;
  private readonly _boundMIDIMessageHandler: (event: unknown) => void;

  constructor(deviceName: string) {
    this.deviceName = deviceName;
    this._boundMIDIMessageHandler = this.onMIDIMessage.bind(this);
  }

  public get midiSuccess(): boolean {
    return this._midiSuccess;
  }

  public async init(): Promise<void> {
    this.destroy();
    await this.initializeMIDIDevices();
  }

  public destroy(): void {
    if (this._midiInput) {
      this._midiInput.onmidimessage = null;
      this._midiInput = null;
    }

    this._midiOutput = null;
    this._midiAccess = null;
    this._midiSuccess = false;

    this.onDestroy();
  }

  public update(_beat: number): void {}

  private async initializeMIDIDevices(): Promise<void> {
    const nav = navigator as Navigator & {
      requestMIDIAccess?: (options?: { sysex?: boolean }) => Promise<MidiAccessLike>;
    };

    if (!nav.requestMIDIAccess) {
      console.error("Web MIDI API is not supported in this browser.");
      return;
    }

    try {
      const midiAccess = (await nav.requestMIDIAccess({ sysex: false })) as unknown as MidiAccessLike;
      this.onMIDISuccess(midiAccess);
    } catch (error) {
      this.onMIDIFailure(error);
    }
  }

  private onMIDISuccess(midiAccess: MidiAccessLike): void {
    this._midiAccess = midiAccess;
    const inputs: MidiInputLike[] = [];
    const outputs: MidiOutputLike[] = [];

    midiAccess.inputs.forEach((input) => {
      inputs.push(input);
    });

    midiAccess.outputs.forEach((output) => {
      outputs.push(output);
    });

    const targetInput = inputs.find((i) => i.name === this.deviceName);
    const targetOutput = outputs.find((o) => o.name === this.deviceName);

    if (!targetInput) {
      console.log(`MIDI Input device '${this.deviceName}' not found.`);
      this._midiSuccess = false;
      return;
    }

    console.log(`MIDI device ready: ${this.deviceName}`);

    this._midiInput = targetInput;
    targetInput.onmidimessage = this._boundMIDIMessageHandler;

    if (targetOutput) {
      this._midiOutput = targetOutput;
    }

    this._midiSuccess = true;

    this.onDeviceSetup();
  }

  private onMIDIFailure(error: unknown): void {
    console.error(`MIDI access failed. - ${error}`);
    this._midiSuccess = false;
  }

  private onMIDIMessage(event: unknown): void {
    if (!event || typeof event !== "object" || !("data" in event)) {
      return;
    }

    const message = event as MidiMessageEventLike;
    if (!message.data || message.data.length < 2) {
      return;
    }

    const status = message.data[0];
    const data1 = message.data[1];
    const data2 = message.data[2] ?? 0;
    this.processMidiMessage(status, data1, data2);
  }

  protected onDeviceSetup(): void {}

  protected onDestroy(): void {}

  protected abstract processMidiMessage(status: number, data1: number, data2: number): void;

  protected sendNoteOn(data1: number, data2: number): void {
    const status = this.getOutputStatus().NOTE_ON;
    this.send(status, data1, data2);
  }

  protected sendNoteOff(data1: number, data2: number): void {
    const status = this.getOutputStatus().NOTE_OFF;
    this.send(status, data1, data2);
  }

  protected sendControlChange(data1: number, data2: number): void {
    const status = this.getOutputStatus().CONTROL_CHANGE;
    this.send(status, data1, data2);
  }

  protected send(status: number, data1: number, data2: number): void {
    if (this._midiOutput) {
      this._midiOutput.send([status, data1, data2]);
    }
  }

  private getOutputStatus(): { NOTE_ON: number; NOTE_OFF: number; CONTROL_CHANGE: number } {
    return (this.constructor as typeof MidiManagerBase).MIDI_OUTPUT_STATUS;
  }
}
