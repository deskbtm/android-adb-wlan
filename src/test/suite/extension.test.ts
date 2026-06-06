import * as assert from "assert";
import * as vscode from "vscode";

suite("extension", () => {
  test("registers ADB WLAN commands", async () => {
    const commands = await vscode.commands.getCommands(true);
    const expectedCommands = ["android.adb.connect", "android.adb.restart", "android.adb.devices"];

    for (const command of expectedCommands) {
      assert.strictEqual(commands.includes(command), true, `missing command: ${command}`);
    }
  });

  test("activates the extension", async () => {
    const extension = vscode.extensions.getExtension("HanWang.android-adb-wlan");
    assert.ok(extension, "extension should be loaded in the test host");

    if (!extension.isActive) {
      await extension.activate();
    }

    assert.strictEqual(extension.isActive, true);
  });
});
