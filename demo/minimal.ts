import p5 from "p5";
import { createController, LED_COLOR } from "../src";
import type { APCMiniMK2Controller, LedColorType, MidiBindingConfig } from "../src";

type DemoKey = "strobo" | "sceneSelect";

const mapping: MidiBindingConfig<DemoKey, LedColorType>[] = [
  {
    key: "strobo",
    type: "toggle",
    targets: [{ row: 0, col: 0 }],
    defaultValue: false,
    inactiveLedColor: LED_COLOR.GRAY,
    activeLedColor: LED_COLOR.GREEN,
  },
  {
    key: "sceneSelect",
    type: "radio",
    targets: [
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ],
    defaultValue: 0,
  },
];

const BPM = 128;

const paletteByScene = [
  { bg: "#0b1f2a", accent: "#59f0ff" },
  { bg: "#1f1228", accent: "#ff5dcf" },
  { bg: "#25170a", accent: "#ffd166" },
];

type MidiPermissionStateLike = "granted" | "denied" | "prompt";

async function getConnectionFailureMessage(): Promise<string> {
  const nav = navigator as Navigator & {
    requestMIDIAccess?: (options?: { sysex?: boolean }) => Promise<unknown>;
    permissions?: {
      query: (descriptor: { name: string; sysex?: boolean }) => Promise<{ state: MidiPermissionStateLike }>;
    };
  };

  if (!nav.requestMIDIAccess) {
    return "WebMIDI is not supported in this browser";
  }

  try {
    const status = await nav.permissions?.query({ name: "midi", sysex: false });
    if (status?.state === "denied") {
      return "WebMIDI permission is denied in this browser";
    }
  } catch {
    // Ignore permission-query errors and fall back to a generic connection message.
  }

  return "APC mini mk2 input device not found";
}

function getInitErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes("notallowed") ||
    normalized.includes("denied") ||
    normalized.includes("security") ||
    normalized.includes("permission")
  ) {
    return "WebMIDI permission was denied";
  }

  return `MIDI init failed: ${message}`;
}

const sketch = (p: p5): void => {
  const controller: APCMiniMK2Controller<DemoKey> = createController<DemoKey>({ mapping });
  let midiReady = false;
  let midiInitialized = false;
  let midiError: string | null = null;

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.noStroke();
    p.textAlign(p.CENTER, p.CENTER);

    void (async () => {
      try {
        await controller.init();
        midiReady = controller.midiSuccess;
        midiError = midiReady ? null : await getConnectionFailureMessage();
      } catch (error) {
        midiError = getInitErrorMessage(error);
        midiReady = false;
      } finally {
        midiInitialized = true;
      }
    })();
  };

  p.draw = () => {
    const beat = (p.millis() / 1000) * (BPM / 60);
    controller?.update(beat);
    midiReady = controller?.midiSuccess ?? false;

    const scene = controller?.radioValue("sceneSelect") ?? 0;
    const strobo = controller?.booleanValue("strobo") ?? false;
    const fader = controller?.faderValue(0) ?? 0;

    const palette = paletteByScene[scene % paletteByScene.length];
    const bg = strobo && Math.floor(beat * 4) % 2 === 0 ? "#f5f5f5" : palette.bg;
    p.background(bg);

    const radius = p.map(fader, 0, 1, 80, p.min(p.width, p.height) * 0.45);
    const ripple = 1 + 0.08 * p.sin(p.TWO_PI * beat);

    p.fill(palette.accent);
    p.circle(p.width * 0.5, p.height * 0.5, radius * ripple);

    p.fill(255);
    p.textSize(14);

    if (!midiInitialized) {
      p.text("Initializing WebMIDI...", p.width * 0.5, p.height - 32);
      return;
    }

    if (!midiReady) {
      p.text(midiError ?? "WebMIDI unavailable", p.width * 0.5, p.height - 32);
      return;
    }

    p.text(`Fader0: ${fader.toFixed(2)} | Scene: ${scene} | Strobo: ${strobo ? "ON" : "OFF"}`, p.width * 0.5, p.height - 32);
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };

  window.addEventListener(
    "beforeunload",
    () => {
      controller?.destroy();
    },
    { once: true },
  );
};

const appRoot = document.getElementById("app");
void new p5(sketch, appRoot ?? undefined);
