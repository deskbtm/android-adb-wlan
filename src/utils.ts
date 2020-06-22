import { commandSync, command } from "execa";
import * as vscode from "vscode";
import * as delay from "delay";
import * as  os from "os";

export interface Devices {
  device: string;
  model: string;
}

export default class Utils {
  private port: string = "1031";
  private usedPorts: Set<string> = new Set();


  private parseDevices(stdout: string): Devices {
    const arr = stdout.split(/\s+/g);
    return { device: arr[0], model: arr[3] };
  }


  private isObject(target: any): boolean {
    return Object.prototype.toString.call(target) === '[object Object]';
  }

  private getAllIpsRec(netInter: any, saver: string[]) {
    for (const key in netInter) {
      const current = netInter[key];
      if (Array.isArray(current)) {

        for (let index = 0; index < current.length; index++) {
          if (this.isObject(current[index])) {
            saver.push(current[index]['address']);
            this.getAllIpsRec(current[index], saver);
          }
        }
      } else if (this.isObject(current)) {
        this.getAllIpsRec(current, saver);
      }
    }

  }


  public isIp(ip: string): boolean {
    return /^(.*)((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)(:(\d+))?$/.test(ip);
  }

  public getIpsHeader(): string[] {
    const netInter = os.networkInterfaces();
    const ips: string[] = [];
    this.getAllIpsRec(netInter, ips);
    return ips.map((val) => val.match(/(.+)(?<=\.)/g)?.pop()!);
  }

  private parseAddress(stdout: string): string[] | undefined {
    return stdout
      .match(/(?<=inet addr:)(.+)(?=Bcast)/g)?.map((val) => val.trim());
  }

  public checkAdbExist(unExist: (err: Error) => void): boolean {

    try {
      commandSync("adb --version");
      return true;
    } catch (e) {
      unExist(e);
      return false;
    }
  }

  public checkDevices(): Devices[] {
    const output = commandSync("adb devices -l").stdout;
    const allLines = output
      .split(/\n|\r\n/)
      .slice(1)
      .filter(val => val !== "");
    if (allLines.length === 0) {
      return [];
    }
    return allLines.map(this.parseDevices);
  }

  public clearPorts() {
    this.usedPorts.clear();
  }

  public async setTcpIpWithDevice(p: string, device: string): Promise<boolean> {
    if (this.usedPorts.has(p)) {
      vscode.window.showErrorMessage(`${p} has been used`);
      return false;
    }

    this.port = p;
    console.debug(`adb -s ${device} tcpip ${this.port}`);
    await command(`adb -s ${device} tcpip ${this.port}`).then(() => {
      this.usedPorts.add(this.port);
    });
    return true;
  }

  public getDeviceAddress(device: string): (string | boolean)[] | undefined {
    console.debug(`adb -s ${device} shell ifconfig`);
    const output = commandSync(`adb -s ${device} shell ifconfig`).stdout;
    const ips = this.getIpsHeader();
    return this.parseAddress(output)?.map((val) => ips.some((v) => val.includes(v)) ? val : false)?.filter(Boolean);
  }

  public connect(ip: string) {
    console.debug(`adb connect ${ip}:${this.port}`);
    return command(`adb connect ${ip}:${this.port}`);
  }

  public async restartServer() {
    await command("adb kill-server");
    await delay(800);
    await command("adb start-server");
  }
}
