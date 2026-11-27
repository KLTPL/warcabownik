import type { RecoveryCode, User } from "generated/prisma/client";
import type { PrismaService } from "src/prisma/prisma.service";

/**
 * In-memory stand-in for the slice of Prisma the MFA services use, with the
 * same conditional-update semantics, so specs can assert on behaviour
 * (lockout, single use, replay) rather than on query shapes. Test-only.
 */

type UserData = {
  [K in keyof User]?: User[K] | { increment: number };
};

type StepCondition = { totpLastUsedStep: null | { lt: number } };

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "player@example.com",
    passwordHash: null,
    username: "player",
    googleId: null,
    githubId: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    totpSecretEnc: null,
    totpEnabled: false,
    totpLastUsedStep: null,
    mfaFailedAttempts: 0,
    mfaLockedUntil: null,
    ...overrides,
  };
}

export function createFakeMfaPrisma(initialUsers: User[]) {
  const users = new Map(initialUsers.map((u) => [u.id, { ...u }]));
  let codes: RecoveryCode[] = [];
  let nextCodeId = 0;

  const getUser = (id: string): User => {
    const row = users.get(id);
    if (!row) throw new Error(`Fake: no user ${id}`);
    return row;
  };

  const applyUserData = (row: User, data: UserData): void => {
    const target = row as Record<string, unknown>;
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && typeof value === "object" && "increment" in value) {
        target[key] = (target[key] as number) + value.increment;
      } else {
        target[key] = value;
      }
    }
  };

  const matchesStep = (row: User, cond: StepCondition): boolean => {
    const step = cond.totpLastUsedStep;
    if (step === null) return row.totpLastUsedStep === null;
    return row.totpLastUsedStep !== null && row.totpLastUsedStep < step.lt;
  };

  const prisma = {
    user: {
      findUnique: ({ where }: { where: { id: string } }) => {
        const row = users.get(where.id);
        return Promise.resolve(row ? { ...row } : null);
      },
      update: ({ where, data }: { where: { id: string }; data: UserData }) => {
        const row = getUser(where.id);
        applyUserData(row, data);
        return Promise.resolve({ ...row });
      },
      updateMany: ({
        where,
        data,
      }: {
        where: { id: string; OR: StepCondition[] };
        data: UserData;
      }) => {
        const row = users.get(where.id);
        if (!row || !where.OR.some((c) => matchesStep(row, c))) {
          return Promise.resolve({ count: 0 });
        }
        applyUserData(row, data);
        return Promise.resolve({ count: 1 });
      },
    },
    recoveryCode: {
      deleteMany: ({ where }: { where: { userId: string } }) => {
        codes = codes.filter((c) => c.userId !== where.userId);
        return Promise.resolve({ count: 0 });
      },
      createMany: ({
        data,
      }: {
        data: { userId: string; codeHash: string }[];
      }) => {
        for (const d of data) {
          codes.push({ id: `code-${nextCodeId++}`, usedAt: null, ...d });
        }
        return Promise.resolve({ count: data.length });
      },
      updateMany: ({
        where,
        data,
      }: {
        where: { userId: string; codeHash: string; usedAt: null };
        data: { usedAt: Date };
      }) => {
        const hits = codes.filter(
          (c) =>
            c.userId === where.userId &&
            c.codeHash === where.codeHash &&
            c.usedAt === null,
        );
        hits.forEach((c) => (c.usedAt = data.usedAt));
        return Promise.resolve({ count: hits.length });
      },
      count: ({ where }: { where: { userId: string; usedAt: null } }) =>
        Promise.resolve(
          codes.filter((c) => c.userId === where.userId && c.usedAt === null)
            .length,
        ),
    },
    $transaction: (arg: unknown): Promise<unknown> =>
      typeof arg === "function"
        ? (arg as (tx: unknown) => Promise<unknown>)(prisma)
        : Promise.all(arg as Promise<unknown>[]),
  };

  return {
    prisma: prisma as unknown as PrismaService,
    getUser: (id: string): User => ({ ...getUser(id) }),
    codes: (): RecoveryCode[] => codes.map((c) => ({ ...c })),
  };
}
