import p5 from "p5";
import { createController, LED_COLOR } from "ts-midi-apc-mini-mk2";
import type { APCMiniMK2Controller, LedColorType, MidiBindingConfig } from "ts-midi-apc-mini-mk2";

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

const sketch = (p: p5): void => {
  let controller: APCMiniMK2Controller<DemoKey> | null = null;
  let midiReady = false;
  let midiAttempted = false;
  let midiError: string | null = null;

  p.setup = () => {
    p.createCanvas(window.innerWidth, window.innerHeight);
    p.noStroke();
    p.textAlign(p.CENTER, p.CENTER);
  };

  p.draw = () => {
    const beat = (p.millis() / 1000) * (BPM / 60);
    controller?.update(beat);

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

    if (!midiAttempted) {
      p.text("Click to initialize WebMIDI", p.width * 0.5, p.height - 32);
      return;
    }

    if (!midiReady) {
      p.text(midiError ?? "WebMIDI unavailable", p.width * 0.5, p.height - 32);
      return;
    }

    p.text(`Fader0: ${fader.toFixed(2)} | Scene: ${scene} | Strobo: ${strobo ? "ON" : "OFF"}`, p.width * 0.5, p.height - 32);
  };

  p.mousePressed = async () => {
    if (midiAttempted) {
      return;
    }

    midiAttempted = true;
    controller = createController<DemoKey>({ mapping });

    try {
      await controller.init();
      midiReady = controller.midiSuccess;
      if (!midiReady) {
        midiError = "APC mini mk2 input device not found";
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      midiError = `MIDI init failed: ${message}`;
      midiReady = false;
    }
  };

  p.windowResized = () => {
    p.resizeCanvas(window.innerWidth, window.innerHeight);
  };

  window.addEventListener(
    "beforeunload",
    () => {
      controller?.destroy();
    },
    { once: true },
  );
};

void new p5(sketch);
