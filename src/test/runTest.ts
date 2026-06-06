import * as path from "path";
import {
  downloadAndUnzipVSCode,
  resolveCliPathFromVSCodeExecutablePath,
  runTests,
} from "@vscode/test-electron";

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");

    console.log("Preparing VS Code stable build for integration tests...");
    const vscodeDownloadPath = await downloadAndUnzipVSCode({ version: "stable" });

    // On macOS, VS Code 1.112+ symlinks Electron -> Code.
    // - Interactive terminal (TTY): spawn Electron directly — shows full Mocha output.
    // - Non-interactive shells (CI / agent): use `code` CLI — avoids `bad option` errors.
    const vscodeExecutablePath = resolveVscodeExecutablePath(vscodeDownloadPath);

    const exitCode = await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ["--disable-extensions"],
    });

    console.log(`Integration test exit code: ${exitCode}`);
    process.exit(exitCode);
  } catch (error) {
    console.error("Failed to run integration tests", error);
    process.exit(1);
  }
}

function resolveVscodeExecutablePath(vscodeDownloadPath: string): string {
  if (process.platform !== "darwin") {
    return vscodeDownloadPath;
  }

  if (process.stdout.isTTY) {
    return vscodeDownloadPath;
  }

  return resolveCliPathFromVSCodeExecutablePath(vscodeDownloadPath);
}

main();
