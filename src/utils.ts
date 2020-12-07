import { commandSync, command } from "execa";
import * as vscode from "vscode";
import * as delay from "delay";
import * as  os from "os";
import { isIPv4 } from 'net';
import * as ipUtil from 'ip';

export interface Devices {
  device: string;
  model: string;
}

export default class Utils {
  private port: string = "1031";
  // private usedPorts: Set<string> = new Set();

  /**
   * Parses devices
   * @param stdout 
   * @returns devices 
   */
  private parseDevices = (stdout: string): Devices => {
    const arr = stdout.split(/\s+/g);
    // // 顺便添加已连接的ip端口 到 usedPorts
    // if (this.isIp(arr[3])) {
    //   const port = arr[3]?.split(':')[1]?.trim();
    //   if (!!port) { this.usedPorts.add(port); }
    // }
    return { device: arr[0], model: arr[3] };
  };

  private isObject(target: any): boolean {
    return Object.prototype.toString.call(target) === '[object Object]';
  }

  private getSeeminglyLanAddress = (): { seemsIp: string, allIpv4: string[] } => {
    const seemsIps: string[] = [];
    const bIp: string[] = [];
    const valid = {} as any;

    // ip rfc
    for (let index = 16; index < 32; index++) {
      bIp.push(`172.${index}.0.0/16`);
    }

    const normalInternalIps = ['10.0.0.0/0', '192.168.0.0/16'].concat(bIp).map((val) => ipUtil.cidrSubnet(val));

    const netInterfaces = os.networkInterfaces();

    for (const adapter of Object.values(netInterfaces)) {

      for (const instance of adapter) {
        if (!instance.internal && isIPv4(instance.address)) {
          seemsIps.push(instance.address);
        }
      }
    }

    valid.allIpv4 = seemsIps;

    for (const ip of seemsIps) {
      normalInternalIps.forEach((val) => {
        val.contains(ip) && (valid.seemsIp = ip);
      });
    }

    return valid;
  };


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
      .match(/(?<=inet\s+)(((\d+)\.)+(\d+))\/\d+/g)?.map((val) => val.trim());
  }

  public checkAdbExist(unExist: (err: Error) => void): boolean {

    try {
      const result = commandSync("adb --version");
      console.log(result.stderr);
      console.log(result.stdout);
      return true;
    } catch (e) {
      unExist(e);
      return false;
    }
  }

  public checkDevices(): Devices[] {
    const output = commandSync(`adb devices -l`).stdout;
    const allLines = output
      .split(/\n|\r\n/)
      .slice(1)
      .filter(val => val !== "");
    if (allLines.length === 0) {
      return [];
    }
    return allLines.map(this.parseDevices);
  }

  // public clearPorts = () => {
  //   this.usedPorts.clear();
  // };

  public async setTcpIpWithDevice(p: string, device: string): Promise<boolean> {
    // if (this.usedPorts.has(p)) {
    //   vscode.window.showErrorMessage(`${p} has been used`);
    //   return false;
    // }

    this.port = p;
    console.debug(`adb -s ${device} tcpip ${this.port}`);
    try {
      await command(`adb -s ${device} tcpip ${this.port}`);
    } catch (error) {
      vscode.window.showErrorMessage(error);
      return false;
    }
    return true;
  }

  public getDeviceAddress(device: string): (string | boolean)[] | undefined {
    console.debug(`adb -s ${device} shell ip -o -4 addr`);
    const output = commandSync(`adb -s ${device} shell ip -o -4 addr`).stdout;
    const ips = this.getSeeminglyLanAddress();
    return this.parseAddress(output)?.map((val) => ipUtil.cidrSubnet(val).contains(ips.seemsIp) ? val?.replace(/\/(\d+)$/, '') : false)?.filter(Boolean);
  }

  public connect(ip: string, name: string) {
    console.debug(`adb -s ${name} connect ${ip}:${this.port}`);
    return command(`adb -s ${name} connect ${ip}:${this.port}`);
  }

  public async restartServer() {
    await command("adb kill-server");
    await delay(800);
    await command("adb start-server");
  }
}
