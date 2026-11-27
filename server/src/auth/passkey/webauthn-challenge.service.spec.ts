import { BadRequestException } from "@nestjs/common";
import type { WebAuthnChallenge } from "generated/prisma/client";
import type { PrismaService } from "src/prisma/prisma.service";
import {
  CHALLENGE_TTL_MS,
  WebAuthnChallengeService,
} from "./webauthn-challenge.service";

function createFakePrisma() {
  const rows = new Map<string, WebAuthnChallenge>();
  let nextId = 0;
  const prisma = {
    webAuthnChallenge: {
      create: ({ data }: { data: Omit<WebAuthnChallenge, "id"> }) => {
        const row = { id: `challenge-${nextId++}`, ...data };
        rows.set(row.id, row);
        return Promise.resolve({ ...row });
      },
      findUnique: ({ where }: { where: { id: string } }) => {
        const row = rows.get(where.id);
        return Promise.resolve(row ? { ...row } : null);
      },
      deleteMany: ({
        where,
      }: {
        where: { id?: string; expiresAt?: { lt: Date } };
      }) => {
        let count = 0;
        for (const [id, row] of rows) {
          const byId = where.id === undefined || where.id === id;
          const byExpiry =
            where.expiresAt === undefined || row.expiresAt < where.expiresAt.lt;
          if (byId && byExpiry) {
            rows.delete(id);
            count++;
          }
        }
        return Promise.resolve({ count });
      },
    },
  };
  return { prisma: prisma as unknown as PrismaService, rows };
}

describe("WebAuthnChallengeService", () => {
  let fake: ReturnType<typeof createFakePrisma>;
  let service: WebAuthnChallengeService;

  beforeEach(() => {
    fake = createFakePrisma();
    service = new WebAuthnChallengeService(fake.prisma);
  });

  afterEach(() => jest.useRealTimers());

  it("returns the stored challenge once, then rejects it", async () => {
    const id = await service.create("abc", "user-1");

    await expect(service.consume(id, "user-1")).resolves.toBe("abc");
    await expect(service.consume(id, "user-1")).rejects.toThrow(
      new BadRequestException("ChallengeExpired"),
    );
  });

  it("rejects an expired challenge", async () => {
    jest.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
    const id = await service.create("abc", null);
    jest.setSystemTime(Date.now() + CHALLENGE_TTL_MS + 1);

    await expect(service.consume(id, null)).rejects.toThrow("ChallengeExpired");
  });

  it("rejects a challenge issued to another user", async () => {
    const id = await service.create("abc", "user-1");

    await expect(service.consume(id, "user-2")).rejects.toThrow(
      "ChallengeExpired",
    );
  });

  it("does not accept a registration challenge for sign-in", async () => {
    const id = await service.create("abc", "user-1");

    await expect(service.consume(id, null)).rejects.toThrow("ChallengeExpired");
  });

  it("rejects an unknown id", async () => {
    await expect(service.consume("missing", null)).rejects.toThrow(
      "ChallengeExpired",
    );
  });

  it("prunes expired challenges when creating a new one", async () => {
    jest.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
    await service.create("old", null);
    jest.setSystemTime(Date.now() + CHALLENGE_TTL_MS + 1);
    const fresh = await service.create("new", null);

    expect([...fake.rows.keys()]).toEqual([fresh]);
  });
});
