import * as assert from "assert";
import { createPairingCredentials, GENERATE_QR_LABEL } from "../../pairingCredentials";

suite("pairingCredentials", () => {
  test("exports QR quick pick label", () => {
    assert.strictEqual(GENERATE_QR_LABEL, "$(qrcode) Generate pairing QR code");
  });

  test("creates AOSP-compatible pairing payload", () => {
    const credentials = createPairingCredentials("192.168.5.100");

    assert.strictEqual(credentials.hostLanIp, "192.168.5.100");
    assert.ok(/^studio-[A-Za-z0-9!@#$%^&*()_+\-=\[\]{}<>?]{10}$/.test(credentials.serviceName));
    assert.ok(/^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{}<>?]{11}$/.test(credentials.password));
    assert.strictEqual(
      credentials.payload,
      `WIFI:T:ADB;S:${credentials.serviceName};P:${credentials.password};;`
    );
  });

  test("generates unique credentials on each call", () => {
    const first = createPairingCredentials("192.168.5.100");
    const second = createPairingCredentials("192.168.5.100");

    assert.notStrictEqual(first.serviceName, second.serviceName);
    assert.notStrictEqual(first.password, second.password);
    assert.notStrictEqual(first.payload, second.payload);
  });
});
