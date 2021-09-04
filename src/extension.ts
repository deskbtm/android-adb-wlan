// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import Utils, { Device } from "./utils";
import * as open from "open";
import * as delay from "delay";

const utils = new Utils();

const Urls = {
  ADB_DOWNLOAD: "https://developer.android.com/studio/releases/platform-tools",
  TUTORIAL: "https://github.com/deskbtm/android-adb-wlan",
};

const Texts = {
  STATUSBAR_TIP: "Device list",
};

const VscodeCmd = {
  restart: "android.adb.restart",
  connect: "android.adb.connect",
  devices: "android.adb.devices",
};

enum PickCmd {
  ANDROID11_ADB = "Android 11 wireless ADB",
  TUTORIAL = "Tutorial",
  RESTART_ADB = "Restart ADB",
}

const handleNotExistAdb = async function () {
  vscode.window.showErrorMessage("ADB does not exist, please install manually and configure the environment", { modal: true });
  await delay(1000);
  await open(Urls.ADB_DOWNLOAD).catch((_err) => {
    console.error(`Open ${Urls.ADB_DOWNLOAD} failed`);
  });
};

const connectADBThroughUSB = async function (devices: Device[]) {
  const port = await vscode.window.showInputBox({
    value: "1031",
    placeHolder: "port (default:1031)", // 在输入框内的提示信息
    prompt: "Input Randomly", // 在输入框下方的提示信息
  });

  if (!!!port) {
    return;
  }

  const isSet = await utils.setTcpIpWithDevice(port!, devices[0].device);

  if (!!!isSet) {
    return;
  }

  await delay(2000);
  const addr = utils.getDeviceAddress(devices[0].device);
  let result;

  if (!!addr.seemingAddress && addr.seemingAddress.length !== 0) {
    result = await vscode.window.showQuickPick(addr.seemingAddress);
  } else {
    vscode.window.showWarningMessage("Unrecognized address through USB, Please connect manually");
    result = await vscode.window.showQuickPick(addr.usbAddress, {
      placeHolder: "Pick Android internal IP",
    });
  }

  if (!!result) {
    utils
      .connect(result!, devices[0].device)
      .then(() => {
        vscode.window.showInformationMessage("Connect success, Pull out the USB", { modal: true });
      })
      .catch((_err) => {
        vscode.window.showErrorMessage(`Connect Error ${_err}`);
      });
  }
};

const connectADBAboveAndroidR = async function () {
  const host = await vscode.window.showInputBox({
    value: "192.168.",
    prompt: "Host",
  });

  if (!!!host) {
    return;
  }

  const port = await vscode.window.showInputBox({
    prompt: "Port",
  });

  if (!!!port) {
    return;
  }

  const code = await vscode.window.showInputBox({
    prompt: "Paring Code(Linux and Windows can not enter)",
  });

  let result;

  if (code) {
    result = utils.adbPairing(host!, port!, code!);
  } else {
    result = utils.adbConnect(host!, port!);
  }

  vscode.window.showInformationMessage(result.stdout, { modal: true });
};

const DeviceItem = (val: Device) => `📱 ${val.model?.replace("model:", "")} 🍰 ${val.device}\t\t${utils.isIp(val.device) ? "Connected" : ""}`;

const showDevicesList = async function () {
  return vscode.window.showQuickPick(
    utils.checkDevices().map((val) => {
      return DeviceItem(val);
    })
  );
};

const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, -2);

const createDevicesListStatusBar = async function () {
  const devices = await utils.checkDevices();

  if (devices.length > 0) {
    const model = devices[0].model ? devices[0].model.replace("model:", "") : "";
    statusBar.tooltip = Texts.STATUSBAR_TIP;
    statusBar.text = "WLAN📱:" + model;
    statusBar.command = VscodeCmd.devices;

    statusBar.show();
  } else {
    statusBar.hide();
  }
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let connectWLAN = vscode.commands.registerCommand(VscodeCmd.connect, async () => {
    const isExistADB = utils.checkAdbExist(handleNotExistAdb);
    const pickList: (Device | string)[] = [];
    if (isExistADB) {
      const devices = utils.checkDevices();

      pickList.push(...devices, PickCmd.ANDROID11_ADB, PickCmd.TUTORIAL, PickCmd.RESTART_ADB);

      const picked = await vscode.window.showQuickPick(
        pickList.map((val) => {
          return typeof val === "string" ? val : DeviceItem(val);
        })
      );

      if (!!!picked) {
        return;
      }

      switch (picked) {
        case PickCmd.RESTART_ADB:
          vscode.commands.executeCommand(VscodeCmd.restart);
          break;

        case PickCmd.ANDROID11_ADB:
          await connectADBAboveAndroidR();
          break;

        case PickCmd.TUTORIAL:
          open(Urls.TUTORIAL).catch((err) => {
            console.error(err);
          });
          break;

        default:
          await connectADBThroughUSB(devices);
          break;
      }
      await createDevicesListStatusBar();
    }
  });

  let restartServer = vscode.commands.registerCommand(VscodeCmd.restart, async () => {
    try {
      vscode.window.showInformationMessage("Adb Restarting");
      statusBar.hide();
      await utils.restartServer();
      vscode.window.showInformationMessage("Adb restart success", { modal: true });
    } catch (e) {
      vscode.window.showErrorMessage(e);
    }
  });

  let devicesList = vscode.commands.registerCommand(VscodeCmd.devices, showDevicesList);

  context.subscriptions.push(connectWLAN, restartServer, devicesList, statusBar);

  createDevicesListStatusBar();
}

// this method is called when your extension is deactivated
export function deactivate() {}
