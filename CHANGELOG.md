# Changelog

このプロジェクトの主な変更は、このファイルに記録します。

## Unreleased

### Added

- ESM と CJS の両方を配布できるデュアル出力対応を追加。
- コントローラーのライフサイクル解放 API `destroy()` を追加。
- `typecheck` と `build` を実行する CI ワークフローを追加。
- MIDI 値をビジュアルパラメータに反映する p5 向けデモを追加。

### Changed

- `src/apc` を `src/apcMiniMk2` にリネーム。
- `WebMidi.*` 名前空間ベースの型参照を標準 DOM MIDI 型に置換。

### Removed

- `test/` ディレクトリと、関連するテスト実行設定を package scripts から削除。

## 0.1.0 - 2026-08-08

### Added

- APC mini mk2 コントローラーパッケージの初回リリース。
- マッピングベースの grid/fader 制御と LED レンダリングを追加。
