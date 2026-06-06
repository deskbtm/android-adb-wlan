# Changelog

All notable changes to the **Android ADB WLAN** extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.0.11] - 2026-06-06

### Added

- QR code pairing for Android 11+ wireless debugging (AOSP `WIFI:T:ADB;...` format)
- Recent wireless IP history in Quick Pick — select to fill, trash icon to remove
- mDNS multi-endpoint connect — tries all `_adb-tls-connect._tcp` ports when stale entries return `Connection refused`
- Single `IP:port` input with format validation for manual wireless connect
- Unit tests for `parsers` and `pairingCredentials`
- Integration tests for ADB WLAN command registration and extension activation
- GitHub Actions workflow to lint, test, and publish to the VS Code Marketplace on `v*` tag push
- `package` and `vscode:publish` scripts via `@vscode/vsce`
- Marketplace metadata: keywords, gallery banner, homepage, and bug tracker links

### Changed

- Refactored core logic into `parsers.ts`, `pairingCredentials.ts`, `pairingQr.ts`, and `AdbUtils`
- Command titles use `ADB WLAN` category with Title Case labels
- Wireless debugging Quick Pick: QR pairing option plus manual IP and history entries
- README professionalized with badges, table of contents, command reference, and search-friendly install hints
- Extension display name and description optimized for Marketplace search (wireless debugging, cross-platform mobile dev)
- Upgraded ESLint to v8 and TypeScript tooling dependencies
- Integration test runner: macOS uses `runTests` with TTY-aware executable resolution (full Mocha output in interactive terminals; `code` CLI fallback in CI/agent shells)

### Fixed

- Entering a valid `IP:port` in Quick Pick no longer incorrectly opens the QR pairing flow
- Wireless connect retries working mDNS endpoints after refused stale ports (e.g. `46745` → `42495`)

## [0.0.10] - 2024-01-09

### Changed

- TypeScript and `utils.ts` maintenance updates

## [0.0.9] - 2022-05-21

### Changed

- Dependency and TypeScript maintenance updates

## [0.0.8] - 2022-05-20

### Changed

- Packaging fixes and README updates

### Removed

- Preview flag from Marketplace listing
