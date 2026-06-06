import execa = require("execa");
import * as vscode from "vscode";
import * as delay from "delay";
import * as os from "os";
import { isIPv4 } from "net";
import * as ipUtil from "ip";
import { isWirelessDeviceAddress, parseAdbDeviceLine, parseMdnsServices } from "./parsers";

export interface Device {
  device: string;
  model: string;
}

export interface DeviceNetworkAddresses {
  matchedLanAddresses: string[];
  allIpv4Addresses: string[];
}

export interface MdnsService {
  instanceName: string;
  serviceType: string;
  address: string;
  port: string;
}

interface HostLanNetwork {
  hostLanIp: string;
  hostIpv4Addresses: string[];
}

export default class AdbUtils {
  private tcpPort: string = "1031";

  private isPlainObject(target: unknown): boolean {
    return Object.prototype.toString.call(target) === "[object Object]";
  }

  private getHostLanNetwork = (): HostLanNetwork => {
    const hostIpv4Addresses: string[] = [];
    const classBRanges: string[] = [];
    const networkInfo = { hostLanIp: "", hostIpv4Addresses } as HostLanNetwork;

    for (let index = 16; index < 32; index++) {
      classBRanges.push(`172.${index}.0.0/16`);
    }

    const privateSubnets = ["10.0.0.0/0", "192.168.0.0/16"].concat(classBRanges).map((cidr) => ipUtil.cidrSubnet(cidr));

    const networkInterfaces = os.networkInterfaces();

    for (const adapter of Object.values(networkInterfaces)) {
      for (const instance of adapter) {
        if (!instance.internal && isIPv4(instance.address)) {
          hostIpv4Addresses.push(instance.address);
        }
      }
    }

    for (const ip of hostIpv4Addresses) {
      privateSubnets.forEach((subnet) => {
        subnet.contains(ip) && (networkInfo.hostLanIp = ip);
      });
    }

    return networkInfo;
  };

  private collectNestedAddresses(networkInterfaces: any, collected: string[]) {
    for (const key in networkInterfaces) {
      const current = networkInterfaces[key];
      if (Array.isArray(current)) {
        for (let index = 0; index < current.length; index++) {
          if (this.isPlainObject(current[index])) {
            collected.push((current[index] as Record<string, string>)["address"]);
            this.collectNestedAddresses(current[index], collected);
          }
        }
      } else if (this.isPlainObject(current)) {
        this.collectNestedAddresses(current, collected);
      }
    }
  }

  public isWirelessDeviceAddress(address: string): boolean {
    return isWirelessDeviceAddress(address);
  }

  public getIpPrefixes(): string[] {
    const networkInterfaces = os.networkInterfaces();
    const addresses: string[] = [];
    this.collectNestedAddresses(networkInterfaces, addresses);
    return addresses.map((address) => address.match(/(.+)(?<=\.)/g)?.pop()!);
  }

  private parseShellIpAddresses(stdout: string): string[] | undefined {
    return stdout.match(/(?<=inet\s+)(((\d+)\.)+(\d+))\/\d+/g)?.map((address) => address.trim());
  }

  public isAdbAvailable(onUnavailable: (err: unknown) => void): boolean {
    try {
      const result = execa.commandSync("adb --version");
      console.log(result.stderr);
      console.log(result.stdout);
      return true;
    } catch (error) {
      onUnavailable(error);
      return false;
    }
  }

  public listDevices(): Device[] {
    const output = execa.commandSync(`adb devices -l`).stdout;
    const deviceLines = output
      .split(/\n|\r\n/)
      .slice(1)
      .filter((line) => line !== "");
    if (deviceLines.length === 0) {
      return [];
    }
    return deviceLines.map(parseAdbDeviceLine);
  }

  public async enableWirelessTcpIp(port: string, deviceSerial: string): Promise<boolean> {
    this.tcpPort = port;
    console.debug(`adb -s ${deviceSerial} tcpip ${this.tcpPort}`);
    try {
      await execa.command(`adb -s ${deviceSerial} tcpip ${this.tcpPort}`);
    } catch (error) {
      vscode.window.showErrorMessage(error as any);
      return false;
    }
    return true;
  }

  public getDeviceNetworkAddresses(deviceSerial: string): DeviceNetworkAddresses {
    const output = execa.commandSync(`adb -s ${deviceSerial} shell ip -o -4 addr`).stdout;
    const hostNetwork = this.getHostLanNetwork();
    let allIpv4Addresses = this.parseShellIpAddresses(output) ?? [];
    const matchedLanAddresses = allIpv4Addresses
      ?.map((address) =>
        ipUtil.cidrSubnet(address).contains(hostNetwork.hostLanIp) ? address?.replace(/\/(\d+)$/, "") : false
      )
      ?.filter(Boolean) as string[];

    allIpv4Addresses = allIpv4Addresses.map((address) => address.replace(/\/(\d+)$/, ""));

    return {
      matchedLanAddresses,
      allIpv4Addresses,
    };
  }

  public connectToDevice(ip: string, deviceSerial: string) {
    console.debug(`adb -s ${deviceSerial} connect ${ip}:${this.tcpPort}`);
    return execa.command(`adb -s ${deviceSerial} connect ${ip}:${this.tcpPort}`);
  }

  public async restartServer() {
    await execa.command("adb kill-server");
    await delay(800);
    await execa.command("adb start-server");
  }

  public getAndroidReleaseVersion() {
    const stdout = execa.commandSync("adb shell getprop ro.build.version.release").stdout;
    return parseInt(stdout);
  }

  public getHostLanIp(): string {
    return this.getHostLanNetwork().hostLanIp;
  }

  public listMdnsServices(): MdnsService[] {
    try {
      const output = execa.commandSync("adb mdns services").stdout;
      return parseMdnsServices(output);
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  public pairDevice(host: string, port: string, pairingCode: string) {
    return execa.sync("adb", ["pair", `${host}:${port}`, pairingCode]);
  }

  public connectDevice(host: string, port: string) {
    return execa.sync("adb", ["connect", `${host}:${port}`]);
  }
}
