import * as crypto from "crypto";

const PAIRING_CHARSET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}<>?";

export const GENERATE_QR_LABEL = "$(qrcode) Generate pairing QR code";

export interface PairingCredentials {
  serviceName: string;
  password: string;
  payload: string;
  hostLanIp: string;
}

const randomToken = (length: number): string => {
  const bytes = crypto.randomBytes(length);
  let token = "";

  for (let index = 0; index < length; index++) {
    token += PAIRING_CHARSET[bytes[index] % PAIRING_CHARSET.length];
  }

  return token;
};

export const createPairingCredentials = (hostLanIp: string): PairingCredentials => {
  const serviceName = `studio-${randomToken(10)}`;
  const password = randomToken(11);
  const payload = `WIFI:T:ADB;S:${serviceName};P:${password};;`;

  return { serviceName, password, payload, hostLanIp };
};
