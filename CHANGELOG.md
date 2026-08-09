# Changelog

このプロジェクトの主な変更は、このファイルに記録します。

## 0.2.0 - 2026-08-10

### Added

- MIDIデバイスの `statechange` を監視し、USB抜き差し時に自動再バインドする接続復帰処理を追加。

### Changed

- `midiSuccess` が初回接続結果ではなく、現在の接続状態を表す動的ステータスになるよう更新。
- 再接続時に内部マッピング状態を保持したまま LED を再同期し、output 復帰時にも即時再送するよう改善。
- `demo/minimal.ts` をページ読み込み時の自動初期化フローへ変更し、権限拒否・未対応・未接続・再接続の状態表示を改善。

### Documentation

- `README.md` に接続ライフサイクル、既知の制約、`midiSuccess` の意味、デモ挙動の説明を追記。

### Packaging

- `package.json` に `repository` / `bugs` / `homepage` を追加し、公開メタデータを補強。

### Migration Notes

- これまで `midiSuccess` を初期化時の成功判定として扱っていた場合は、現在接続状態を表す値として監視する実装へ更新が必要。

## 0.1.0 - 2026-08-08

### Added

- APC mini mk2 コントローラーパッケージの初回リリース。
- マッピングベースの grid/fader 制御と LED レンダリングを追加。
- `createController` を中心とした公開 API を追加。
- コントローラーのライフサイクル解放 API `destroy()` を追加。
- バインディング種別 `toggle` / `radio` / `oneshot` / `momentary` / `state` / `sequence` / `random` を追加。
- p5 向けデモ（`demo/minimal.ts`）を追加。

### Changed

- `src/apc` を `src/apcMiniMk2` にリネーム。
- `WebMidi.*` 名前空間ベースの型参照を互換性のある WebMIDI 実装型へ置換。

### Packaging

- ESM/CJS デュアル配布（`main` / `module` / `exports` / `types`）に対応。
- `files` を `dist` のみに最小化。
- GitHub install 用に `prepare` ビルドを有効化。
- `prepublishOnly` で `clean -> typecheck -> build` を実行する品質ゲートを追加。

### CI

- GitHub Actions で `typecheck` と `build` を実行する CI ワークフローを追加。

### Removed

- `test/` ディレクトリと、関連するテスト実行設定を package scripts から削除。
