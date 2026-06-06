import * as assert from "assert";
import {
  connectFirstAvailableEndpoint,
  isConnectSuccessful,
  isWirelessDeviceAddress,
  matchesServiceName,
  parseAdbDeviceLine,
  parseDeviceAddress,
  parseMdnsServices,
} from "../../parsers";
import { MdnsService } from "../../utils";

suite("parsers", () => {
  suite("parseDeviceAddress", () => {
    test("parses valid IP:port", () => {
      assert.deepStrictEqual(parseDeviceAddress("192.168.1.100:5555"), {
        host: "192.168.1.100",
        port: "5555",
      });
    });

    test("trims whitespace", () => {
      assert.deepStrictEqual(parseDeviceAddress("  10.0.0.8:37043  "), {
        host: "10.0.0.8",
        port: "37043",
      });
    });

    test("rejects missing port", () => {
      assert.strictEqual(parseDeviceAddress("192.168.1.100"), undefined);
    });

    test("rejects partial IP", () => {
      assert.strictEqual(parseDeviceAddress("192.168."), undefined);
    });
  });

  suite("parseAdbDeviceLine", () => {
    test("parses adb devices -l line", () => {
      assert.deepStrictEqual(parseAdbDeviceLine("emulator-5554 device product:sdk model:Pixel_6 device:emu transport_id:1"), {
        device: "emulator-5554",
        model: "model:Pixel_6",
      });
    });
  });

  suite("parseMdnsServices", () => {
    test("parses adb mdns services output", () => {
      const stdout = [
        "List of discovered mdns services",
        "studio-abc123\t_adb-tls-pairing._tcp\t192.168.5.5:41234",
        "adb-58da15a1-crfF9c\t_adb-tls-connect._tcp\t192.168.5.5:46745",
        "adb-58da15a1-crfF9c (2)\t_adb-tls-connect._tcp\t192.168.5.5:42495",
      ].join("\n");

      assert.deepStrictEqual(parseMdnsServices(stdout), [
        {
          instanceName: "studio-abc123",
          serviceType: "_adb-tls-pairing._tcp",
          address: "192.168.5.5",
          port: "41234",
        },
        {
          instanceName: "adb-58da15a1-crfF9c",
          serviceType: "_adb-tls-connect._tcp",
          address: "192.168.5.5",
          port: "46745",
        },
        {
          instanceName: "adb-58da15a1-crfF9c (2)",
          serviceType: "_adb-tls-connect._tcp",
          address: "192.168.5.5",
          port: "42495",
        },
      ]);
    });

    test("ignores malformed lines", () => {
      const stdout = ["List of discovered mdns services", "broken-line", "studio-x\t_adb-tls-pairing._tcp\tinvalid"].join(
        "\n"
      );

      assert.deepStrictEqual(parseMdnsServices(stdout), []);
    });
  });

  suite("matchesServiceName", () => {
    test("matches exact and prefixed instance names", () => {
      assert.strictEqual(matchesServiceName("studio-abc", "studio-abc"), true);
      assert.strictEqual(matchesServiceName("studio-abc (2)", "studio-abc"), true);
      assert.strictEqual(matchesServiceName("studio-other", "studio-abc"), false);
    });
  });

  suite("isConnectSuccessful", () => {
    test("detects successful connect output", () => {
      assert.strictEqual(isConnectSuccessful("connected to 192.168.5.5:42495"), true);
      assert.strictEqual(isConnectSuccessful("already connected to 192.168.5.5:42495"), true);
    });

    test("rejects refused endpoints", () => {
      assert.strictEqual(isConnectSuccessful("failed to connect to '192.168.5.5:46745': Connection refused"), false);
    });
  });

  suite("isWirelessDeviceAddress", () => {
    test("detects wireless adb endpoint", () => {
      assert.strictEqual(isWirelessDeviceAddress("192.168.5.5:42495"), true);
      assert.strictEqual(isWirelessDeviceAddress("emulator-5554"), false);
    });
  });

  suite("connectFirstAvailableEndpoint", () => {
    const services: MdnsService[] = [
      {
        instanceName: "adb-device",
        serviceType: "_adb-tls-connect._tcp",
        address: "192.168.5.5",
        port: "46745",
      },
      {
        instanceName: "adb-device (2)",
        serviceType: "_adb-tls-connect._tcp",
        address: "192.168.5.5",
        port: "42495",
      },
      {
        instanceName: "studio-abc",
        serviceType: "_adb-tls-pairing._tcp",
        address: "192.168.5.5",
        port: "41234",
      },
    ];

    test("tries stale endpoint then connects to working one", () => {
      const attempts: string[] = [];
      const connected = connectFirstAvailableEndpoint(services, "192.168.5.5", (address, port) => {
        attempts.push(`${address}:${port}`);
        if (port === "46745") {
          return { stdout: "failed to connect to '192.168.5.5:46745': Connection refused", stderr: "" };
        }
        return { stdout: "connected to 192.168.5.5:42495", stderr: "" };
      });

      assert.deepStrictEqual(attempts, ["192.168.5.5:46745", "192.168.5.5:42495"]);
      assert.deepStrictEqual(connected, {
        service: services[1],
        output: "connected to 192.168.5.5:42495",
      });
    });

    test("skips already tried endpoints across calls", () => {
      const triedEndpoints = new Set<string>(["192.168.5.5:46745"]);
      const attempts: string[] = [];
      const connected = connectFirstAvailableEndpoint(
        services,
        "192.168.5.5",
        (address, port) => {
          attempts.push(`${address}:${port}`);
          return { stdout: "connected to 192.168.5.5:42495", stderr: "" };
        },
        triedEndpoints
      );

      assert.deepStrictEqual(attempts, ["192.168.5.5:42495"]);
      assert.strictEqual(connected?.service.port, "42495");
    });
  });
});
