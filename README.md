# Android ADB WLAN

[![Version](https://img.shields.io/visual-studio-marketplace/v/HanWang.android-adb-wlan?label=version)](https://marketplace.visualstudio.com/items?itemName=HanWang.android-adb-wlan)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/HanWang.android-adb-wlan)](https://marketplace.visualstudio.com/items?itemName=HanWang.android-adb-wlan)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Connect Android devices to ADB over Wi-Fi directly from VS Code. Set up wireless debugging in a few steps, manage multiple devices, and keep your workflow cable-free after the initial pairing.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Connection Workflows](#connection-workflows)
- [Commands](#commands)
- [Screenshots](#screenshots)
- [Troubleshooting](#troubleshooting)
- [Known Limitations](#known-limitations)
- [Development](#development)
- [Related Extensions](#related-extensions)
- [License](#license)

## Overview

Android ADB WLAN wraps common ADB wireless workflows into VS Code commands and UI affordances:

- A title-bar action for quick access
- A status bar indicator for the active device
- A device picker backed by `adb devices -l`
- Automatic LAN IP matching between host and device

The extension shells out to the system `adb` binary. No additional daemon or mobile app is required.

## Features

| Capability | Description |
| --- | --- |
| Wireless debugging | Connect devices over WLAN after setup |
| Multi-device support | View and switch between multiple connected devices |
| USB-assisted setup | `adb tcpip` flow for Android 10 and below |
| Android 11+ pairing | Native wireless debugging with `adb pair` / `adb connect` |
| Status bar | Shows the current device model; click to open the device list |
| IP selection | Prefers addresses on the same LAN segment as the host |

## Requirements

| Item | Details |
| --- | --- |
| Editor | VS Code `^1.42.0` or compatible forks |
| Host OS | Windows and Linux (primary targets) |
| ADB | [Android SDK Platform-Tools](https://developer.android.com/studio/releases/platform-tools) on `PATH` |
| Network | Phone and computer on the same LAN |
| Device | USB debugging enabled; wireless debugging enabled for Android 11+ |

Verify ADB before using the extension:

```bash
adb --version
adb devices -l
```

## Installation

**From the Marketplace**

1. Open the Extensions view in VS Code (`Ctrl+Shift+X` / `Cmd+Shift+X`)
2. Search for **Android ADB WLAN**
3. Click **Install**

Direct link: [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=HanWang.android-adb-wlan)

## Getting Started

1. Install and configure ADB on your machine.
2. Enable **USB debugging** on the Android device.
3. For Android 11+, also enable **Wireless debugging** under Developer options.
4. Ensure the device and host share the same Wi-Fi network.
5. Launch a connection:
   - Click the ADB icon in the editor title bar, or
   - Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run `ADB WLAN: Connect over Wi-Fi`

After a successful connection, the status bar displays the connected device model. Click it to inspect the device list.

## Connection Workflows

### USB-assisted (Android 10 and below)

Use this path when the device is connected over USB and supports `adb tcpip`.

```text
USB device detected
  → enter TCP port (default: 1031)
  → adb tcpip <port>
  → pick device IP (auto-matched LAN IP preferred)
  → adb connect <ip>:<port>
  → disconnect USB
```

**Steps**

1. Connect the device via USB and authorize the debugging prompt.
2. Run `ADB WLAN: Connect over Wi-Fi`.
3. Select the USB device from the picker.
4. Enter a TCP port when prompted (default: `1031`).
5. Choose the device IP address.
6. Remove the USB cable once the success dialog appears.

### Wireless debugging (Android 11+)

Use this path when **Wireless debugging** is enabled on the device.

**Pair with QR code**

1. Run `ADB WLAN: Connect over Wi-Fi` and select **Wireless debugging (Android 11+)**.
2. In the address prompt, select **Generate pairing QR code**.
3. On the phone, tap **Pair device with QR code** and scan the QR shown in VS Code.
4. The extension waits for the `_adb-tls-pairing._tcp` mDNS announce, runs `adb pair`, then connects automatically.

The QR payload follows the Android Studio / AOSP format:

```text
WIFI:T:ADB;S:studio-<service>;P:<password>;;
```

**Manual IP:port**

1. In the address prompt, enter `IP:port` (e.g. `192.168.1.100:37043`), or select a recent IP below and append the port.
2. Enter the pairing code if required, or leave it empty to connect directly.

> Both devices must be on the same Wi-Fi network and mDNS (UDP 5353) must not be blocked. Refer to the [official wireless debugging guide](https://developer.android.com/studio/command-line/adb#connect-to-a-device-over-wi-fi-android-11+) for more details.

## Commands

| Command Palette | Command ID | Description |
| --- | --- | --- |
| ADB WLAN: Connect over Wi-Fi | `android.adb.connect` | Open the connection workflow and device picker |
| ADB WLAN: Restart ADB Server | `android.adb.restart` | Restart the ADB server (`kill-server` → `start-server`) |
| ADB WLAN: Show Connected Devices | `android.adb.devices` | Show all devices reported by `adb devices -l` |

The connect command also exposes quick actions for documentation, ADB server restart, and Android 11+ wireless setup.

## Screenshots

**Device list and status bar**

![Device list and status bar](./doc/1.png)

**End-to-end usage**

![Usage demo](./doc/usage.gif)

## Troubleshooting

| Symptom | Suggested action |
| --- | --- |
| `ADB does not exist` | Install Platform-Tools and ensure `adb` is on `PATH` |
| No devices in the picker | Reconnect USB, accept the RSA prompt, run `adb devices -l` |
| Connection fails after IP selection | Confirm both ends are on the same LAN; retry with `ADB WLAN: Restart ADB Server` |
| Unrecognized address through USB | Pick the device IP manually from the fallback list |
| Stale or ghost devices | Run `ADB WLAN: Restart ADB Server` to reset the ADB server |

If the issue persists, include your OS, Android version, ADB version, and command output when you [open an issue](https://github.com/deskbtm/android-adb-wlan/issues).

## Known Limitations

- Primary testing coverage is on **Windows** and **Linux**; macOS behavior is not guaranteed.
- **Virtual machines** are not supported.
- Host and device must remain on the same LAN; cross-subnet or hotspot-only setups may fail.
- Device compatibility varies by OEM image and ADB policy.
- The extension depends on the locally installed `adb` binary and inherits its platform quirks.

## Development

```bash
git clone https://github.com/deskbtm/android-adb-wlan.git
cd android-adb-wlan
npm install
npm run compile
```

Press `F5` in VS Code to launch an Extension Development Host.

| Script | Purpose |
| --- | --- |
| `npm run compile` | Build TypeScript to `out/` |
| `npm run watch` | Rebuild on file changes |
| `npm run lint` | Run ESLint on `src/` |
| `npm test` | Compile, lint, and run extension tests |

## Related Extensions

- [Colorful Monorepo](https://marketplace.visualstudio.com/items?itemName=deskbtm.colorful-monorepo) — workspace coloring for monorepos

## License

This project is licensed under the [MIT License](LICENSE).
