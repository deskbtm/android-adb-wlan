// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import AdbUtils, { Device } from "./utils";
import { parseDeviceAddress } from "./parsers";
import { GENERATE_QR_LABEL, runPairingQrFlow } from "./pairingQr";
import * as open from "open";
import * as delay from "delay";

const adbUtils = new AdbUtils();

const RECENT_IPS_KEY = "recentWirelessIps";
const MAX_RECENT_IPS = 8;

let extensionContext: vscode.ExtensionContext;

const ADB_DOWNLOAD_URL = "https://developer.android.com/studio/releases/platform-tools";
const DOCS_URL = "https://github.com/deskbtm/android-adb-wlan";

const CommandId = {
  restart: "android.adb.restart",
  connect: "android.adb.connect",
  devices: "android.adb.devices",
};

enum ConnectMenuAction {
  WIRELESS_DEBUGGING = "Wireless debugging (Android 11+)",
  OPEN_DOCS = "Open documentation",
  RESTART_SERVER = "Restart ADB server",
}

const onAdbMissing = async function () {
  vscode.window.showErrorMessage("ADB was not found. Install Android Platform-Tools and add adb to your PATH.", { modal: true });
  await delay(1000);
  await open(ADB_DOWNLOAD_URL).catch((_error) => {
    console.error(`Open ${ADB_DOWNLOAD_URL} failed`);
  });
};

const connectViaUsbBridge = async function (devices: Device[]) {
  const tcpPort = await vscode.window.showInputBox({
    value: "1031",
    placeHolder: "TCP port (default: 1031)",
    prompt: "Enter the TCP port for wireless ADB",
  });

  if (!tcpPort) {
    return;
  }

  const targetDevice = devices[0];
  const tcpIpEnabled = await adbUtils.enableWirelessTcpIp(tcpPort, targetDevice.device);

  if (!tcpIpEnabled) {
    return;
  }

  await delay(2000);
  const addresses = adbUtils.getDeviceNetworkAddresses(targetDevice.device);
  let selectedAddress: string | undefined;

  if (addresses.matchedLanAddresses.length > 0) {
    selectedAddress = await vscode.window.showQuickPick(addresses.matchedLanAddresses);
  } else {
    vscode.window.showWarningMessage("Could not auto-detect a matching LAN IP. Select the device IP manually.");
    selectedAddress = await vscode.window.showQuickPick(addresses.allIpv4Addresses, {
      placeHolder: "Select the device IP address",
    });
  }

  if (selectedAddress) {
    adbUtils
      .connectToDevice(selectedAddress, targetDevice.device)
      .then(() => {
        vscode.window.showInformationMessage("Connected successfully. You can unplug the USB cable.", { modal: true });
      })
      .catch((error) => {
        vscode.window.showErrorMessage(`Connection failed: ${error}`);
      });
  }
};

const getRecentIps = (): string[] => {
  return extensionContext.globalState.get<string[]>(RECENT_IPS_KEY, []);
};

const saveRecentIp = async (host: string) => {
  const recentIps = getRecentIps().filter((ip) => ip !== host);
  recentIps.unshift(host);
  await extensionContext.globalState.update(RECENT_IPS_KEY, recentIps.slice(0, MAX_RECENT_IPS));
};

const removeRecentIp = async (host: string) => {
  const recentIps = getRecentIps().filter((ip) => ip !== host);
  await extensionContext.globalState.update(RECENT_IPS_KEY, recentIps);
};

type WirelessPromptResult = { action: "address"; value: string } | { action: "qr" } | undefined;

const buildRecentIpQuickPickItems = (recentIps: string[]): vscode.QuickPickItem[] => [
  {
    label: GENERATE_QR_LABEL,
    description: "Pair with QR code (Android 11+)",
    detail: "Phone scans this QR to pair automatically via mDNS",
    alwaysShow: true,
  },
  { label: "Format: IP:port", kind: vscode.QuickPickItemKind.Separator },
  ...recentIps.map((ip) => ({
    label: ip,
    description: "Recently connected",
    detail: "Select to fill IP:, click trash to remove",
    buttons: [
      {
        iconPath: new vscode.ThemeIcon("trash"),
        tooltip: "Remove from history",
      },
    ],
  })),
];

const promptWirelessDeviceAddress = (recentIps: string[]): Promise<WirelessPromptResult> => {
  return new Promise((resolve) => {
    const quickPick = vscode.window.createQuickPick();
    let accepted = false;

    quickPick.title = "Wireless debugging address";
    quickPick.placeholder = "IP:port";
    quickPick.prompt =
      "Format: IP:port (e.g. 192.168.1.100:5555), generate a pairing QR code, or select a recent IP below.";
    quickPick.value = "192.168.";
    quickPick.items = buildRecentIpQuickPickItems(recentIps);

    const resolveQrPairing = () => {
      if (accepted) {
        return;
      }

      accepted = true;
      quickPick.hide();
      resolve({ action: "qr" });
    };

    quickPick.onDidChangeSelection((selection) => {
      const selectedItem = selection[0];
      if (!selectedItem || selectedItem.kind === vscode.QuickPickItemKind.Separator) {
        return;
      }

      if (selectedItem.label === GENERATE_QR_LABEL) {
        return;
      }

      quickPick.value = `${selectedItem.label}:`;
      quickPick.selectedItems = [];
    });

    quickPick.onDidTriggerItemButton(async (event) => {
      await removeRecentIp(event.item.label);
      quickPick.items = buildRecentIpQuickPickItems(getRecentIps());
    });

    quickPick.onDidAccept(() => {
      if (accepted) {
        return;
      }

      const value = quickPick.value.trim();
      if (parseDeviceAddress(value)) {
        accepted = true;
        quickPick.hide();
        resolve({ action: "address", value });
        return;
      }

      const selectedItem = quickPick.selectedItems[0] ?? quickPick.activeItems[0];
      if (selectedItem?.label === GENERATE_QR_LABEL) {
        resolveQrPairing();
        return;
      }
    });

    quickPick.onDidHide(() => {
      quickPick.dispose();
      if (!accepted) {
        resolve(undefined);
      }
    });

    quickPick.show();
  });
};

const connectWirelessDebugging = async function () {
  const promptResult = await promptWirelessDeviceAddress(getRecentIps());
  if (!promptResult) {
    return;
  }

  if (promptResult.action === "qr") {
    await runPairingQrFlow(adbUtils, saveRecentIp);
    return;
  }

  const parsedAddress = parseDeviceAddress(promptResult.value);
  if (!parsedAddress) {
    vscode.window.showErrorMessage("Invalid address. Format: IP:port (e.g. 192.168.1.100:5555)");
    return;
  }

  const pairingCode = await vscode.window.showInputBox({
    placeHolder: "123456",
    prompt: "Pairing code (optional on Windows/Linux; leave empty to connect directly)",
  });

  const adbResult = pairingCode
    ? adbUtils.pairDevice(parsedAddress.host, parsedAddress.port, pairingCode)
    : adbUtils.connectDevice(parsedAddress.host, parsedAddress.port);

  await saveRecentIp(parsedAddress.host);
  vscode.window.showInformationMessage(adbResult.stdout, { modal: true });
};

const formatDeviceLabel = (device: Device) =>
  `📱 ${device.model?.replace("model:", "")} · ${device.device}${adbUtils.isWirelessDeviceAddress(device.device) ? " · Wi-Fi" : ""}`;

const showDevicePicker = async function () {
  return vscode.window.showQuickPick(adbUtils.listDevices().map((device) => formatDeviceLabel(device)));
};

const deviceStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, -2);

const updateDeviceStatusBar = async function () {
  const devices = adbUtils.listDevices();

  if (devices.length > 0) {
    const model = devices[0].model ? devices[0].model.replace("model:", "") : "";
    deviceStatusBar.tooltip = "Show connected devices";
    deviceStatusBar.text = `ADB WLAN: ${model}`;
    deviceStatusBar.command = CommandId.devices;

    deviceStatusBar.show();
  } else {
    deviceStatusBar.hide();
  }
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  extensionContext = context;

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const connectCommand = vscode.commands.registerCommand(CommandId.connect, async () => {
    const hasAdb = adbUtils.isAdbAvailable(onAdbMissing);
    if (!hasAdb) {
      return;
    }

    const devices = adbUtils.listDevices();
    const menuItems: (Device | string)[] = [
      ...devices,
      ConnectMenuAction.WIRELESS_DEBUGGING,
      ConnectMenuAction.OPEN_DOCS,
      ConnectMenuAction.RESTART_SERVER,
    ];

    const selectedItem = await vscode.window.showQuickPick(
      menuItems.map((item) => (typeof item === "string" ? item : formatDeviceLabel(item))),
      { placeHolder: "Select a device or action" }
    );

    if (!selectedItem) {
      return;
    }

    switch (selectedItem) {
      case ConnectMenuAction.RESTART_SERVER:
        vscode.commands.executeCommand(CommandId.restart);
        break;

      case ConnectMenuAction.WIRELESS_DEBUGGING:
        await connectWirelessDebugging();
        break;

      case ConnectMenuAction.OPEN_DOCS:
        open(DOCS_URL).catch((error) => {
          console.error(error);
        });
        break;

      default:
        await connectViaUsbBridge(devices);
        break;
    }

    await updateDeviceStatusBar();
  });

  const restartCommand = vscode.commands.registerCommand(CommandId.restart, async () => {
    try {
      vscode.window.showInformationMessage("Restarting ADB server...");
      deviceStatusBar.hide();
      await adbUtils.restartServer();
      vscode.window.showInformationMessage("ADB server restarted successfully.", { modal: true });
    } catch (error) {
      vscode.window.showErrorMessage(error as any);
    }
  });

  const devicesCommand = vscode.commands.registerCommand(CommandId.devices, showDevicePicker);

  context.subscriptions.push(connectCommand, restartCommand, devicesCommand, deviceStatusBar);

  updateDeviceStatusBar();
}

// this method is called when your extension is deactivated
export function deactivate() { }
