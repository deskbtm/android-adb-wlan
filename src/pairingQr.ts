import * as vscode from "vscode";
import * as QRCode from "qrcode";
import * as delay from "delay";
import AdbUtils, { MdnsService } from "./utils";
import { connectFirstAvailableEndpoint, matchesServiceName } from "./parsers";
import { createPairingCredentials, PairingCredentials } from "./pairingCredentials";

export { GENERATE_QR_LABEL, createPairingCredentials } from "./pairingCredentials";

const PAIRING_TIMEOUT_MS = 120000;
const CONNECT_TIMEOUT_MS = 45000;
const CONNECT_SETTLE_DELAY_MS = 2000;
const MDNS_POLL_INTERVAL_MS = 1500;

const buildQrWebviewHtml = (qrDataUrl: string, credentials: PairingCredentials, status: string): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 20px;
      line-height: 1.5;
    }
    .card {
      max-width: 420px;
      margin: 0 auto;
      text-align: center;
    }
    img {
      width: 280px;
      height: 280px;
      margin: 16px 0;
      border: 1px solid var(--vscode-panel-border);
      background: #fff;
      padding: 8px;
      border-radius: 4px;
    }
    .meta {
      text-align: left;
      margin-top: 16px;
      padding: 12px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      font-size: 12px;
      word-break: break-all;
    }
    .status {
      margin-top: 12px;
      color: var(--vscode-descriptionForeground);
    }
    ol {
      text-align: left;
      padding-left: 20px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>Pair device with QR code</h2>
    <ol>
      <li>On your phone, open <strong>Settings → Developer options → Wireless debugging</strong>.</li>
      <li>Tap <strong>Pair device with QR code</strong>.</li>
      <li>Scan the QR code below.</li>
    </ol>
    <img src="${qrDataUrl}" alt="ADB pairing QR code" />
    <div class="meta">
      <div><strong>Host IP:</strong> ${credentials.hostLanIp}</div>
      <div><strong>Service:</strong> ${credentials.serviceName}</div>
      <div><strong>Password:</strong> ${credentials.password}</div>
      <div><strong>Payload:</strong> ${credentials.payload}</div>
    </div>
    <div class="status" id="status">${status}</div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    window.addEventListener("message", (event) => {
      if (event.data && event.data.status) {
        document.getElementById("status").textContent = event.data.status;
      }
    });
  </script>
</body>
</html>`;
};

const updatePanelStatus = (panel: vscode.WebviewPanel, status: string) => {
  panel.webview.postMessage({ status });
};

const waitForMdnsService = async (
  adbUtils: AdbUtils,
  serviceName: string,
  serviceType: string,
  timeoutMs: number
): Promise<MdnsService | undefined> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const services = adbUtils.listMdnsServices().filter((service) => {
      return service.serviceType === serviceType && matchesServiceName(service.instanceName, serviceName);
    });

    if (services.length > 0) {
      return services[0];
    }

    await delay(MDNS_POLL_INTERVAL_MS);
  }

  return undefined;
};

const tryConnectToDevice = async (
  adbUtils: AdbUtils,
  preferredHost: string,
  timeoutMs: number,
  onAttempt?: (endpoint: string) => void
): Promise<{ service: MdnsService; output: string } | undefined> => {
  const triedEndpoints = new Set<string>();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const connected = connectFirstAvailableEndpoint(
      adbUtils.listMdnsServices(),
      preferredHost,
      (address, port) => {
        onAttempt?.(`${address}:${port}`);
        const connectResult = adbUtils.connectDevice(address, port);
        console.log(connectResult.stdout);
        console.log(connectResult.stderr);
        return connectResult;
      },
      triedEndpoints
    );

    if (connected) {
      return connected;
    }

    await delay(MDNS_POLL_INTERVAL_MS);
  }

  return undefined;
};

export const runPairingQrFlow = async (adbUtils: AdbUtils, onConnected?: (deviceIp: string) => Promise<void>) => {
  const hostLanIp = adbUtils.getHostLanIp();
  if (!hostLanIp) {
    vscode.window.showErrorMessage("Could not detect host LAN IP. Connect your computer to Wi-Fi first.");
    return;
  }

  const credentials = createPairingCredentials(hostLanIp);
  const qrDataUrl = await QRCode.toDataURL(credentials.payload, { margin: 2, width: 300 });
  const panel = vscode.window.createWebviewPanel("adbPairingQr", "ADB Pairing QR", vscode.ViewColumn.Active, {
    enableScripts: true,
    retainContextWhenHidden: true,
  });

  panel.webview.html = buildQrWebviewHtml(qrDataUrl, credentials, "Waiting for phone to scan the QR code...");

  try {
    updatePanelStatus(panel, "Waiting for _adb-tls-pairing._tcp announce...");
    const pairingService = await waitForMdnsService(
      adbUtils,
      credentials.serviceName,
      "_adb-tls-pairing._tcp",
      PAIRING_TIMEOUT_MS
    );

    if (!pairingService) {
      updatePanelStatus(panel, "Timed out waiting for the phone to scan the QR code.");
      vscode.window.showErrorMessage(
        "Pairing timed out. Ensure both devices are on the same Wi-Fi and scan the QR code from Wireless debugging."
      );
      return;
    }

    updatePanelStatus(panel, `Pairing with ${pairingService.address}:${pairingService.port}...`);
    const pairResult = adbUtils.pairDevice(pairingService.address, pairingService.port, credentials.password);
    console.log(pairResult.stdout);
    console.log(pairResult.stderr);

    updatePanelStatus(panel, "Paired successfully. Waiting for connect endpoint...");
    await delay(CONNECT_SETTLE_DELAY_MS);

    const connected = await tryConnectToDevice(adbUtils, pairingService.address, CONNECT_TIMEOUT_MS, (endpoint) => {
      updatePanelStatus(panel, `Trying connect endpoint ${endpoint}...`);
    });

    if (!connected) {
      updatePanelStatus(panel, "Paired, but no working connect endpoint was found.");
      vscode.window.showWarningMessage(
        `Paired successfully, but connect failed on all discovered endpoints. Connect manually with ${pairingService.address}:<port> from Wireless debugging if needed.`
      );
      if (onConnected) {
        await onConnected(pairingService.address);
      }
      return;
    }

    const { service: connectService, output: connectOutput } = connected;
    updatePanelStatus(panel, `Connected to ${connectService.address}:${connectService.port}`);
    vscode.window.showInformationMessage(connectOutput || "Connected successfully.", { modal: true });

    if (onConnected) {
      await onConnected(connectService.address);
    }
  } catch (error) {
    console.error(error);
    updatePanelStatus(panel, `Pairing failed: ${error}`);
    vscode.window.showErrorMessage(`QR pairing failed: ${error}`);
  }
};
