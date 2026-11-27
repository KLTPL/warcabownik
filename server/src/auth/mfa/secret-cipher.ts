import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const FORMAT_VERSION = "v1";

/**
 * Encrypts TOTP secrets at rest, so a database leak alone does not hand out
 * working second factors. Output: `v1:<iv>:<authTag>:<ciphertext>` (base64).
 */
export class SecretCipher {
  constructor(private readonly key: Buffer) {
    if (key.length !== KEY_BYTES) {
      throw new Error(
        `SecretCipher key must be ${KEY_BYTES} bytes, got ${key.length}`,
      );
    }
  }

  /** Builds the cipher from `TOTP_ENCRYPTION_KEY` (32 bytes, base64). */
  static fromEnv(): SecretCipher {
    const encoded = process.env.TOTP_ENCRYPTION_KEY;
    if (!encoded) {
      throw new Error(
        "TOTP_ENCRYPTION_KEY is not set (generate one: openssl rand -base64 32)",
      );
    }
    return new SecretCipher(Buffer.from(encoded, "base64"));
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    return [
      FORMAT_VERSION,
      iv.toString("base64"),
      cipher.getAuthTag().toString("base64"),
      ciphertext.toString("base64"),
    ].join(":");
  }

  decrypt(encoded: string): string {
    const [version, iv, authTag, ciphertext] = encoded.split(":");
    if (version !== FORMAT_VERSION || !iv || !authTag || !ciphertext) {
      throw new Error("Unrecognised encrypted secret format");
    }
    const decipher = createDecipheriv(
      ALGORITHM,
      this.key,
      Buffer.from(iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(authTag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }
}
