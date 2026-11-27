import { randomBytes } from "node:crypto";
import { generate } from "otplib";
import { User } from "generated/prisma/client";
import { LOCKOUT_MS, MAX_FAILED_ATTEMPTS, MfaService } from "./mfa.service";
import { SecretCipher } from "./secret-cipher";
import { TotpService } from "./totp.service";
import { RecoveryCodesService } from "./recovery-codes.service";
import { buildUser, createFakeMfaPrisma } from "./fake-mfa-prisma";

describe("MfaService", () => {
  const cipher = new SecretCipher(randomBytes(32));
  const totp = new TotpService();
  const secret = totp.generateSecret();
  const USER_ID = "user-1";

  let fake: ReturnType<typeof createFakeMfaPrisma>;
  let service: MfaService;

  const setup = (user: User) => {
    fake = createFakeMfaPrisma([user]);
    service = new MfaService(
      fake.prisma,
      totp,
      new RecoveryCodesService(fake.prisma),
      cipher,
    );
  };

  const codeAt = (offsetSeconds = 0) =>
    generate({ secret, epoch: Math.floor(Date.now() / 1000) + offsetSeconds });

  const wrongCode = async () =>
    (await codeAt()) === "000000" ? "111111" : "000000";

  const enabledUser = (overrides: Partial<User> = {}) =>
    buildUser({
      totpEnabled: true,
      totpSecretEnc: cipher.encrypt(secret),
      ...overrides,
    });

  describe("setup and enable", () => {
    beforeEach(() => setup(buildUser()));

    it("stores an encrypted pending secret and returns it for scanning", async () => {
      const result = await service.startTotpSetup(USER_ID);
      const stored = fake.getUser(USER_ID);

      expect(stored.totpEnabled).toBe(false);
      expect(stored.totpSecretEnc).not.toContain(result.secret);
      expect(cipher.decrypt(stored.totpSecretEnc!)).toBe(result.secret);
      expect(result.otpauthUrl).toContain("player%40example.com");
      expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it("refuses to enable without a pending setup", async () => {
      await expect(service.enableTotp(USER_ID, "123456")).rejects.toThrow(
        "TotpSetupMissing",
      );
    });

    it("keeps 2FA off when the confirmation code is wrong", async () => {
      const { secret: pending } = await service.startTotpSetup(USER_ID);
      const valid = await generate({ secret: pending });
      const wrong = valid === "000000" ? "111111" : "000000";

      await expect(service.enableTotp(USER_ID, wrong)).rejects.toThrow(
        "InvalidTotpCode",
      );
      expect(fake.getUser(USER_ID).totpEnabled).toBe(false);
    });

    it("enables 2FA and returns 10 recovery codes on a valid code", async () => {
      const { secret: pending } = await service.startTotpSetup(USER_ID);
      const codes = await service.enableTotp(
        USER_ID,
        await generate({ secret: pending }),
      );

      expect(codes).toHaveLength(10);
      expect(fake.getUser(USER_ID).totpEnabled).toBe(true);
      expect(await service.getStatus(USER_ID)).toEqual({
        totpEnabled: true,
        recoveryCodesRemaining: 10,
      });
    });

    it("refuses a second setup once enabled", async () => {
      setup(enabledUser());
      await expect(service.startTotpSetup(USER_ID)).rejects.toThrow(
        "TotpAlreadyEnabled",
      );
    });
  });

  describe("verifySecondFactor", () => {
    beforeEach(() => setup(enabledUser()));

    it("accepts a valid TOTP code", async () => {
      const user = await service.verifySecondFactor(USER_ID, await codeAt());
      expect(user.id).toBe(USER_ID);
    });

    it("rejects a replayed TOTP code", async () => {
      const code = await codeAt();
      await service.verifySecondFactor(USER_ID, code);
      await expect(service.verifySecondFactor(USER_ID, code)).rejects.toThrow(
        "InvalidTotpCode",
      );
    });

    it("accepts a recovery code once", async () => {
      const [recovery] = await new RecoveryCodesService(fake.prisma).regenerate(
        USER_ID,
      );
      await service.verifySecondFactor(USER_ID, recovery);
      await expect(
        service.verifySecondFactor(USER_ID, recovery),
      ).rejects.toThrow("InvalidTotpCode");
    });

    it("rejects users without 2FA", async () => {
      setup(buildUser());
      await expect(
        service.verifySecondFactor(USER_ID, await codeAt()),
      ).rejects.toThrow("TotpNotEnabled");
    });

    it(`locks after ${MAX_FAILED_ATTEMPTS} misses, even for a correct code`, async () => {
      const wrong = await wrongCode();
      for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
        await expect(
          service.verifySecondFactor(USER_ID, wrong),
        ).rejects.toThrow("InvalidTotpCode");
      }
      await expect(
        service.verifySecondFactor(USER_ID, await codeAt()),
      ).rejects.toThrow("TooManyAttempts");

      const lockedUntil = fake.getUser(USER_ID).mfaLockedUntil!.getTime();
      expect(lockedUntil).toBeGreaterThan(Date.now() + LOCKOUT_MS - 5_000);
    });

    it("allows attempts again once the lock has expired", async () => {
      setup(enabledUser({ mfaLockedUntil: new Date(Date.now() - 1) }));
      await expect(
        service.verifySecondFactor(USER_ID, await codeAt()),
      ).resolves.toBeDefined();
    });

    it("resets the failure counter on success", async () => {
      await expect(
        service.verifySecondFactor(USER_ID, await wrongCode()),
      ).rejects.toThrow();
      expect(fake.getUser(USER_ID).mfaFailedAttempts).toBe(1);

      await service.verifySecondFactor(USER_ID, await codeAt());
      expect(fake.getUser(USER_ID).mfaFailedAttempts).toBe(0);
    });
  });

  describe("disable", () => {
    beforeEach(() => setup(enabledUser()));

    it("requires a valid code", async () => {
      await expect(
        service.disableTotp(USER_ID, await wrongCode()),
      ).rejects.toThrow("InvalidTotpCode");
      expect(fake.getUser(USER_ID).totpEnabled).toBe(true);
    });

    it("clears the secret and recovery codes", async () => {
      await new RecoveryCodesService(fake.prisma).regenerate(USER_ID);
      await service.disableTotp(USER_ID, await codeAt());

      const user = fake.getUser(USER_ID);
      expect(user.totpEnabled).toBe(false);
      expect(user.totpSecretEnc).toBeNull();
      expect(fake.codes()).toHaveLength(0);
    });
  });
});
