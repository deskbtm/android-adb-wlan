// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import Utils from "./utils";
import * as open from "open";
import * as delay from "delay";

const utils = new Utils();
const ADB_DOWNLOAD_URL = "https://adbshell.com/downloads";

const notExistAdb = async function() {
  vscode.window.showErrorMessage("adb does not exist, please install");
  await open(ADB_DOWNLOAD_URL).catch(err => {
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
      if (isAdb) {
        const devices = utils.checkDevices();
        if (devices.length === 0) {
          vscode.window.showWarningMessage("Please connect usb first");
        }

        if (devices.length > 1) {
          vscode.window.showErrorMessage(
            "More than one Device, Please restart the adb"
          );
        }

        if (devices.length === 1) {
          let devicesList = devices
            .map(ele => `device:${ele.device}  ${ele.model}`)
            .join("\n");
          vscode.window.showInformationMessage(devicesList);
          const port = await vscode.window.showInputBox({
            placeHolder: "port (default:1031)", // 在输入框内的提示信息
            prompt: "Input Randomly" // 在输入框下方的提示信息
          });
          await utils.setTcpIp(port!);
          await delay(1500);
          const addr = utils.getAddress();

          if (!!addr) {
            utils
              .connect(addr as string)
              .then(() => {
                vscode.window.showInformationMessage(
                  "Connect success, Pull out the USB",
                  { modal: true }
                );
              })
              .catch(() => {
                vscode.window.showErrorMessage("Connect Error");
              });
          } else {
            vscode.window.showErrorMessage("Ip parse Error");
          }
        }
      }
    }
  );
  let restartServer = vscode.commands.registerCommand(
    "android.adb.restart",
    () => {
      try {
        utils.restartServer();
      } catch (e) {
        vscode.window.showErrorMessage(e);
      }
    }
  );

  context.subscriptions.push(connectWlan, restartServer);
}

// this method is called when your extension is deactivated
export function deactivate() {}
