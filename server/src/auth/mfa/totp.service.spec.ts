import { generate } from "otplib";
import { TotpService } from "./totp.service";

describe("TotpService", () => {
  const service = new TotpService();
  const secret = service.generateSecret();
  const nowSeconds = () => Math.floor(Date.now() / 1000);
  const codeAt = (offsetSeconds: number) =>
    generate({ secret, epoch: nowSeconds() + offsetSeconds });

  it("accepts the current code and returns its time step", async () => {
    const step = await service.verify(secret, await codeAt(0), null);
    expect(step).toBe(Math.floor(nowSeconds() / 30));
  });

  it("rejects a wrong code", async () => {
    const valid = await codeAt(0);
    const wrong = valid === "000000" ? "111111" : "000000";
    expect(await service.verify(secret, wrong, null)).toBeNull();
  });

  it("rejects malformed codes without throwing", async () => {
    for (const bad of ["", "12345", "1234567", "abcdef"]) {
      expect(await service.verify(secret, bad, null)).toBeNull();
    }
  });

  it("tolerates one step of clock drift either way", async () => {
    expect(
      await service.verify(secret, await codeAt(-30), null),
    ).not.toBeNull();
    expect(await service.verify(secret, await codeAt(30), null)).not.toBeNull();
  });

  it("rejects codes from further away", async () => {
    expect(await service.verify(secret, await codeAt(-120), null)).toBeNull();
  });

  it("rejects a replay of an already-used time step", async () => {
    const code = await codeAt(0);
    const step = await service.verify(secret, code, null);
    expect(step).not.toBeNull();
    expect(await service.verify(secret, code, step)).toBeNull();
  });

  it("builds an otpauth URL with issuer and account", () => {
    const url = service.buildOtpauthUrl(secret, "me@example.com");
    expect(url).toMatch(/^otpauth:\/\/totp\/Warcabownik:me%40example\.com\?/);
    expect(url).toContain(`secret=${secret}`);
  });

  it("renders the URL as a PNG data URL", async () => {
    const dataUrl = await service.toQrCodeDataUrl("otpauth://totp/x?secret=A");
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
