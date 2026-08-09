# Changelog

このプロジェクトの主な変更は、このファイルに記録します。

## Unreleased

### Added

- MIDIデバイスの `statechange` を監視し、USB抜き差し時に自動再バインドする接続復帰処理を追加。

### Changed

- `midiSuccess` が初回接続結果ではなく、現在の接続状態を表す動的ステータスになるよう更新。
- 再接続時に内部マッピング状態を保持したまま LED を再同期するように改善。
- `demo/minimal.ts` で初期化リトライ（再クリック）が可能になるよう改善。

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
