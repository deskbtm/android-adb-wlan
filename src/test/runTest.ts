import * as path from "path";
import { runTests } from "@vscode/test-electron";

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");

    console.log("Preparing VS Code stable build for integration tests...");
    const exitCode = await runTests({
      version: "stable",
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

main();
