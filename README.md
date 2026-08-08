# ts-midi-apc-mini-mk2

Akai APC mini mk2 を WebMIDI で扱うための TypeScript MIDI コントローラーライブラリです。

## インストール

### npm install

```bash
npm install ts-midi-apc-mini-mk2
```

### GitHub install

```bash
npm install github:kimurakoya/ts-midi-apc-mini-mk2
```

GitHub install 時は `prepare` が自動実行されるため、依存インストール時に `dist` がビルドされます。

## 最小サンプル

```typescript
import { createController, LED_COLOR } from "ts-midi-apc-mini-mk2";
import type { MidiBindingConfig, LedColorType } from "ts-midi-apc-mini-mk2";

type GridKey = "strobo" | "sceneSelect";

const mapping: MidiBindingConfig<GridKey, LedColorType>[] = [
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

const controller = createController<GridKey>({ mapping });

// ブラウザ制約があるため、必要に応じてユーザー操作イベント内で呼び出してください。
await controller.init();

function render(currentBeat: number): void {
  controller.update(currentBeat); // 同期的に state と LED を反映

  const strobeOn = controller.booleanValue("strobo");
  const sceneIndex = controller.radioValue("sceneSelect");

  void strobeOn;
  void sceneIndex;
}

// アプリ終了時やアンマウント時に MIDI ハンドラを解放
controller.destroy();
```

## API

### createController<TKey>(options)

`APCMiniMK2Controller<TKey>` を返します。

### オプション

| プロパティ             | 型                                        | 必須   | 説明                                                                    |
| ---------------------- | ----------------------------------------- | ------ | ----------------------------------------------------------------------- |
| `mapping`              | `MidiBindingConfig<TKey, LedColorType>[]` | はい   | グリッドバインディング定義                                              |
| `faderButtonFunctions` | `FaderButtonFunction[]`                   | いいえ | フェーダーごとのモード機能（`"random"` または `"mute"`）。長さは 9 必須 |

### Controller API

| メンバー              | 型              | 説明                                                              |
| --------------------- | --------------- | ----------------------------------------------------------------- |
| `init()`              | `Promise<void>` | WebMIDI 接続を初期化します                                        |
| `destroy()`           | `void`          | MIDI イベントハンドラを解除し、ランタイム参照を解放します         |
| `update(beat)`        | `void`          | beat 同期更新と LED 出力を同期的に反映します                      |
| `midiSuccess`         | `boolean`       | デバイス入力の解決に成功した場合 `true` です                      |
| `faderValue(index)`   | `number`        | 正規化済みフェーダー値 `0..1`（またはモード反映後の値）を返します |
| `booleanValue(key)`   | `boolean`       | toggle/oneshot/momentary/random の状態を返します                  |
| `radioValue(key)`     | `number`        | 選択中の radio index を返します                                   |
| `stateValue(key)`     | `number`        | 現在の state cycle 値を返します                                   |
| `sequenceActive(key)` | `boolean`       | 現在ステップが active かどうかを返します                          |

### バインディング種別

`toggle`, `radio`, `oneshot`, `momentary`, `state`, `sequence`, `random`

## 対応ブラウザ

- Chrome (latest)
- Edge (latest)
- Safari (latest)

注意:

- WebMIDI の利用可否や権限仕様はブラウザごとに異なります。
- ブラウザポリシー上必要な場合は、`init()` をユーザー操作イベント内で呼んでください。
- 本番 VJ システムでは `midiSuccess === false` を非致命分岐として扱ってください。

## FAQ

### Q. `midiSuccess` is false. Why?

- APC mini mk2 が接続されていない可能性があります。
- ブラウザ権限が拒否されている可能性があります。
- 実行コンテキストで WebMIDI が未対応の可能性があります。

### Q. When should `update()` be called?

レンダーティックごとに 1 回、現在の beat を渡して呼び出してください。このライブラリはリアルタイムループ用途を前提とし、ホットパスでの不要な重い処理を抑える設計です。

### Q. Do I need to call `destroy()`?

はい。アプリ終了時またはコンポーネントのアンマウント時に呼び出して、イベントハンドラとリソースを解放してください。

## 開発

```bash
npm run typecheck
npm run build
```

代表的な p5 デモは `demo/minimal.ts` にあります。

### デモ実行

```bash
npm install
npm run dev
```

ブラウザで表示された URL の `/demo/` を開くと、`demo/index.html` から `demo/minimal.ts` を確認できます。
例: `http://localhost:5173/demo/`

## License

MIT
