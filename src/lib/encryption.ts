import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

const algorithm = "aes-256-gcm";
const key = Buffer.from(env.ENCRYPTION_KEY_BASE64, "base64");

if (key.length !== 32) {
  throw new Error("ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes.");
}

export type EncryptedSecret = {
  encryptedPrivateKey: string;
  keyIv: string;
  keyAuthTag: string;
};

export function encryptPrivateKey(privateKey: string): EncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(privateKey, "utf8"),
    cipher.final()
  ]);

  return {
    encryptedPrivateKey: encrypted.toString("base64"),
    keyIv: iv.toString("base64"),
    keyAuthTag: cipher.getAuthTag().toString("base64")
  };
}

export function decryptPrivateKey(secret: EncryptedSecret): string {
  const decipher = createDecipheriv(
    algorithm,
    key,
    Buffer.from(secret.keyIv, "base64")
  );
  decipher.setAuthTag(Buffer.from(secret.keyAuthTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(secret.encryptedPrivateKey, "base64")),
    decipher.final()
  ]).toString("utf8");
}
