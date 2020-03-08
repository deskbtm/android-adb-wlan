import { commandSync, command } from "execa";
import execa = require("execa");
import delay = require("delay");

interface Devices {
  device: string;
  model: string;
}

export default class Utils {
  port: string | number = 1031;
  private parseDevices(stdout: string): Devices {
    const arr = stdout.split(/\s+/g);
    return { device: arr[0], model: arr[3] };
  }

  private parseAddress(stdout: string): string | undefined {
    return stdout
      .match(/(?<=inet addr:)(.+)(?=Bcast)/g)
      ?.pop()
      ?.trim();
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

  public setTcpIp(p: string) {
    this.port = p === "" || !!!p ? this.port : p;
    return command(`adb tcpip ${this.port}`);
  }

  public getAddress(): string | undefined {
    const output = commandSync("adb shell ifconfig wlan0").stdout;
    return this.parseAddress(output);
  }

  public connect(ip: string) {
    return command(`adb connect ${ip}:${this.port}`);
  }

  public async restartServer() {
    await command("adb kill-server");
    await delay(800);
    await command("adb start-server");
  }
}
