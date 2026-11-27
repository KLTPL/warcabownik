import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import type { Passkey, User } from "generated/prisma/client";
import type { PrismaService } from "src/prisma/prisma.service";
import { buildUser } from "../mfa/fake-mfa-prisma";
import { PasskeyService } from "./passkey.service";
import type { WebAuthnChallengeService } from "./webauthn-challenge.service";
import { WebAuthnConfig } from "./webauthn.config";

// The cryptography is the library's job; these specs cover what we do with
// its verdicts.
jest.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));

const mockGenRegistration = jest.mocked(generateRegistrationOptions);
const mockGenAuthentication = jest.mocked(generateAuthenticationOptions);
const mockVerifyRegistration = jest.mocked(verifyRegistrationResponse);
const mockVerifyAuthentication = jest.mocked(verifyAuthenticationResponse);

const CONFIG = new WebAuthnConfig(
  "localhost",
  "Warcabownik",
  "http://localhost:5173",
);

function buildPasskey(overrides: Partial<Passkey> = {}): Passkey {
  return {
    id: "pk-1",
    userId: "user-1",
    credentialId: "cred-1",
    publicKey: Buffer.from([1, 2, 3]),
    counter: 5,
    transports: ["internal"],
    deviceType: "multiDevice",
    backedUp: true,
    name: "Laptop",
    createdAt: new Date(0),
    lastUsedAt: null,
    ...overrides,
  };
}

function createFakePrisma(users: User[], initial: Passkey[]) {
  let passkeys = initial.map((p) => ({ ...p }));
  const prisma = {
    user: {
      findUnique: ({ where }: { where: { id: string } }) =>
        Promise.resolve(users.find((u) => u.id === where.id) ?? null),
    },
    passkey: {
      findMany: ({ where }: { where: { userId: string } }) =>
        Promise.resolve(passkeys.filter((p) => p.userId === where.userId)),
      findUnique: ({ where }: { where: { credentialId: string } }) => {
        const row = passkeys.find((p) => p.credentialId === where.credentialId);
        const user = row && users.find((u) => u.id === row.userId);
        return Promise.resolve(row ? { ...row, user } : null);
      },
      create: ({
        data,
      }: {
        data: Omit<Passkey, "id" | "createdAt" | "lastUsedAt">;
      }) => {
        const row = buildPasskey({ ...data, id: `pk-${passkeys.length + 1}` });
        passkeys.push(row);
        return Promise.resolve({ ...row });
      },
      update: ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<Passkey>;
      }) => {
        const row = passkeys.find((p) => p.id === where.id);
        if (!row) throw new Error(`Fake: no passkey ${where.id}`);
        Object.assign(row, data);
        return Promise.resolve({ ...row });
      },
      updateMany: ({
        where,
        data,
      }: {
        where: { id: string; userId: string };
        data: Partial<Passkey>;
      }) => {
        const hits = passkeys.filter(
          (p) => p.id === where.id && p.userId === where.userId,
        );
        hits.forEach((p) => Object.assign(p, data));
        return Promise.resolve({ count: hits.length });
      },
      findUniqueOrThrow: ({ where }: { where: { id: string } }) => {
        const row = passkeys.find((p) => p.id === where.id);
        if (!row) throw new Error(`Fake: no passkey ${where.id}`);
        return Promise.resolve({ ...row });
      },
      deleteMany: ({ where }: { where: { id: string; userId: string } }) => {
        const before = passkeys.length;
        passkeys = passkeys.filter(
          (p) => !(p.id === where.id && p.userId === where.userId),
        );
        return Promise.resolve({ count: before - passkeys.length });
      },
    },
  };
  return {
    prisma: prisma as unknown as PrismaService,
    passkeys: () => passkeys.map((p) => ({ ...p })),
  };
}

const registrationResponse = { id: "cred-new" } as RegistrationResponseJSON;
const authenticationResponse = { id: "cred-1" } as AuthenticationResponseJSON;

describe("PasskeyService", () => {
  const user = buildUser();
  const otherUser = buildUser({ id: "user-2", email: "other@example.com" });
  let fake: ReturnType<typeof createFakePrisma>;
  let challenges: { create: jest.Mock; consume: jest.Mock };
  let service: PasskeyService;

  beforeEach(() => {
    jest.resetAllMocks();
    fake = createFakePrisma([user, otherUser], [buildPasskey()]);
    challenges = {
      create: jest.fn().mockResolvedValue("challenge-id"),
      consume: jest.fn().mockResolvedValue("expected-challenge"),
    };
    service = new PasskeyService(
      fake.prisma,
      challenges as unknown as WebAuthnChallengeService,
      CONFIG,
    );
  });

  describe("registrationOptions", () => {
    it("requires a discoverable, user-verified credential and excludes existing ones", async () => {
      mockGenRegistration.mockResolvedValue({ challenge: "c1" } as never);

      const result = await service.registrationOptions(user.id);

      const opts = mockGenRegistration.mock.calls[0][0];
      expect(opts.authenticatorSelection).toEqual({
        residentKey: "required",
        userVerification: "required",
      });
      expect(opts.excludeCredentials).toEqual([
        { id: "cred-1", transports: ["internal"] },
      ]);
      expect(opts.rpID).toBe("localhost");
      expect(challenges.create).toHaveBeenCalledWith("c1", user.id);
      expect(result.challengeId).toBe("challenge-id");
    });
  });

  describe("register", () => {
    it("saves the verified credential", async () => {
      mockVerifyRegistration.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: "cred-new",
            publicKey: new Uint8Array([9, 9]),
            counter: 0,
            transports: ["hybrid"],
          },
          credentialDeviceType: "singleDevice",
          credentialBackedUp: false,
        },
      } as never);

      const summary = await service.register(
        user.id,
        "challenge-id",
        registrationResponse,
        "Phone",
      );

      expect(challenges.consume).toHaveBeenCalledWith("challenge-id", user.id);
      expect(mockVerifyRegistration).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedChallenge: "expected-challenge",
          expectedOrigin: "http://localhost:5173",
          expectedRPID: "localhost",
          requireUserVerification: true,
        }),
      );
      const saved = fake.passkeys().find((p) => p.credentialId === "cred-new");
      expect(saved).toMatchObject({
        userId: user.id,
        name: "Phone",
        counter: 0,
        transports: ["hybrid"],
        deviceType: "singleDevice",
        backedUp: false,
      });
      expect(saved?.publicKey).toEqual(Buffer.from([9, 9]));
      expect(summary).not.toHaveProperty("publicKey");
    });

    it("rejects an unverified response and saves nothing", async () => {
      mockVerifyRegistration.mockResolvedValue({ verified: false });

      await expect(
        service.register(
          user.id,
          "challenge-id",
          registrationResponse,
          "Phone",
        ),
      ).rejects.toThrow(new BadRequestException("PasskeyVerificationFailed"));
      expect(fake.passkeys()).toHaveLength(1);
    });

    it("maps a library error to PasskeyVerificationFailed", async () => {
      const libraryError = new Error("Unexpected origin");
      mockVerifyRegistration.mockRejectedValue(libraryError);

      const attempt = service.register(
        user.id,
        "challenge-id",
        registrationResponse,
        "Phone",
      );
      await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
      await expect(attempt).rejects.toMatchObject({
        message: "PasskeyVerificationFailed",
        cause: libraryError,
      });
    });
  });

  describe("authenticate", () => {
    it("issues no user challenge and requires user verification", async () => {
      mockGenAuthentication.mockResolvedValue({ challenge: "c2" });

      await service.authenticationOptions();

      expect(mockGenAuthentication).toHaveBeenCalledWith({
        rpID: "localhost",
        userVerification: "required",
      });
      expect(challenges.create).toHaveBeenCalledWith("c2", null);
    });

    it("returns the owner and records the new counter", async () => {
      mockVerifyAuthentication.mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 6, credentialBackedUp: true },
      } as never);

      const result = await service.authenticate(
        "challenge-id",
        authenticationResponse,
      );

      expect(result.id).toBe(user.id);
      expect(challenges.consume).toHaveBeenCalledWith("challenge-id", null);
      const opts = mockVerifyAuthentication.mock.calls[0][0];
      expect(opts.expectedChallenge).toBe("expected-challenge");
      expect(opts.requireUserVerification).toBe(true);
      expect(opts.credential).toMatchObject({ id: "cred-1", counter: 5 });
      const [stored] = fake.passkeys();
      expect(stored.counter).toBe(6);
      expect(stored.lastUsedAt).toBeInstanceOf(Date);
    });

    it("rejects an unknown credential", async () => {
      await expect(
        service.authenticate("challenge-id", { id: "nope" } as never),
      ).rejects.toThrow(new NotFoundException("PasskeyNotFound"));
      expect(mockVerifyAuthentication).not.toHaveBeenCalled();
    });

    it("rejects a failed verification without touching the counter", async () => {
      mockVerifyAuthentication.mockResolvedValue({
        verified: false,
        authenticationInfo: { newCounter: 99 },
      } as never);

      await expect(
        service.authenticate("challenge-id", authenticationResponse),
      ).rejects.toThrow("PasskeyVerificationFailed");
      expect(fake.passkeys()[0].counter).toBe(5);
    });

    it("rejects when the library throws (e.g. a counter rollback)", async () => {
      mockVerifyAuthentication.mockRejectedValue(new Error("counter"));

      await expect(
        service.authenticate("challenge-id", authenticationResponse),
      ).rejects.toThrow("PasskeyVerificationFailed");
      expect(fake.passkeys()[0].lastUsedAt).toBeNull();
    });
  });

  describe("list / remove", () => {
    it("lists only the user's passkeys, without key material", async () => {
      const list = await service.list(user.id);

      expect(list.passkeys).toEqual([
        {
          id: "pk-1",
          credentialId: "cred-1",
          name: "Laptop",
          createdAt: new Date(0),
          lastUsedAt: null,
          backedUp: true,
        },
      ]);
      const other = await service.list(otherUser.id);
      expect(other.passkeys).toEqual([]);
    });

    it("returns the RP ID and the user handle used at registration", async () => {
      mockGenRegistration.mockResolvedValue({ challenge: "c1" } as never);
      await service.registrationOptions(user.id);
      const registeredHandle = mockGenRegistration.mock.calls[0][0].userID;

      const list = await service.list(user.id);

      expect(list.rpId).toBe("localhost");
      expect(Buffer.from(list.userId, "base64url")).toEqual(
        Buffer.from(registeredHandle!),
      );
      expect(list.userId).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("renames the user's own passkey", async () => {
      const renamed = await service.rename(user.id, "pk-1", "Work laptop");

      expect(renamed.name).toBe("Work laptop");
      expect(fake.passkeys()[0].name).toBe("Work laptop");
    });

    it("refuses to rename another user's passkey", async () => {
      await expect(
        service.rename(otherUser.id, "pk-1", "Mine now"),
      ).rejects.toThrow(new NotFoundException("PasskeyNotFound"));
      expect(fake.passkeys()[0].name).toBe("Laptop");
    });

    it("removes the user's own passkey", async () => {
      await service.remove(user.id, "pk-1");

      expect(fake.passkeys()).toEqual([]);
    });

    it("refuses to remove another user's passkey", async () => {
      await expect(service.remove(otherUser.id, "pk-1")).rejects.toThrow(
        new NotFoundException("PasskeyNotFound"),
      );
      expect(fake.passkeys()).toHaveLength(1);
    });
  });
});
