import { Devices } from './utils';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import Utils from "./utils";
import * as open from "open";
import * as delay from "delay";


const utils = new Utils();
const ADB_DOWNLOAD_URL = "https://adbshell.com/downloads";

const notExistAdb = async function () {
  vscode.window.showErrorMessage("adb does not exist, please install");
  await open(ADB_DOWNLOAD_URL).catch(_err => {
    console.error(`open ${ADB_DOWNLOAD_URL} failed`);
  });
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let connectWlan = vscode.commands.registerCommand(
    "android.adb.connect",
    async () => {
      const isAdb = utils.checkAdbExist(notExistAdb);
      const pickList: (Devices | string)[] = [];
      if (isAdb) {
        const devices = utils.checkDevices();
        if (devices.length === 0) {
          vscode.window.showWarningMessage("Please connect usb first");
          return;
        }
        pickList.push(...devices, "restart");

        const picked = await vscode.window.showQuickPick(pickList.map((val) => {
          return typeof val === "string" ? val :
            `📱 ${val.model.replace('model:', "")}  👙 ${val.device}\t\t${utils.isIp(val.device) ? "Connected" : ""}`;
        }));

        if (picked === undefined) {
          return;
        }

        if (picked === "restart") {
          vscode.commands.executeCommand("android.adb.restart");
          return;
        }

        const port = await vscode.window.showInputBox({
          value: "1031",
          placeHolder: "port (default:1031)", // 在输入框内的提示信息
          prompt: "Input Randomly" // 在输入框下方的提示信息
        });

        if (port === undefined) { return; };

        const isSet = await utils.setTcpIpWithDevice(port!, devices[0].device);

        if (!!!isSet) {
          vscode.window.showErrorMessage("unset tcpip connection");
          return;
        }
        await delay(2000);
        const addr = utils.getDeviceAddress(devices[0].device) as string[];
        if (!!addr && addr.length !== 0) {
          const result = await vscode.window.showQuickPick(addr);
          !!result &&
            utils
              .connect(result!)
              .then(() => {
                vscode.window.showInformationMessage(
                  "Connect success, Pull out the USB",
                  { modal: true }
                );
              })
              .catch((_err) => {
                vscode.window.showErrorMessage("Connect Error");
              });
        } else {
          vscode.window.showWarningMessage("not search address");
        }

      }
    }
  );

  let restartServer = vscode.commands.registerCommand(
    "android.adb.restart",
    async () => {
      try {
        utils.clearPorts();
        await utils.restartServer();
        vscode.window.showInformationMessage(
          "Adb restart success",
          { modal: true }
        );
      } catch (e) {
        vscode.window.showErrorMessage(e);
      }
    }
  );

  context.subscriptions.push(connectWlan, restartServer);
}

// this method is called when your extension is deactivated
export function deactivate() { }
