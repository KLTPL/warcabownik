import { randomBytes } from "node:crypto";
import { SecretCipher } from "./secret-cipher";

describe("SecretCipher", () => {
  const cipher = new SecretCipher(randomBytes(32));

  it("round-trips a secret", () => {
    const encrypted = cipher.encrypt("JBSWY3DPEHPK3PXP");
    expect(encrypted).not.toContain("JBSWY3DPEHPK3PXP");
    expect(cipher.decrypt(encrypted)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("uses a fresh IV per encryption", () => {
    expect(cipher.encrypt("same")).not.toBe(cipher.encrypt("same"));
  });

  it("rejects tampered ciphertext", () => {
    const [version, iv, tag, data] = cipher.encrypt("secret").split(":");
    const flipped = Buffer.from(data, "base64");
    flipped[0] ^= 0xff;
    const tampered = [version, iv, tag, flipped.toString("base64")].join(":");
    expect(() => cipher.decrypt(tampered)).toThrow();
  });

  it("rejects a value encrypted under another key", () => {
    const other = new SecretCipher(randomBytes(32));
    expect(() => cipher.decrypt(other.encrypt("secret"))).toThrow();
  });

  it("rejects keys that are not 32 bytes", () => {
    expect(() => new SecretCipher(randomBytes(16))).toThrow(/32 bytes/);
  });
});
