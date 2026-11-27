import { ConflictException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UserService } from "./user.service";

// Mirrors what @prisma/adapter-pg produces for a Postgres 23505 error:
// the violated constraint is reported by index name, e.g. "User_email_key".
const uniqueViolation = (constraint: { index?: string; fields?: string[] }) =>
  new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
    meta: {
      modelName: "User",
      driverAdapterError: {
        cause: { kind: "UniqueConstraintViolation", constraint },
      },
    },
  });

let service: UserService;
let prisma: { user: { create: jest.Mock } };

beforeEach(() => {
  prisma = { user: { create: jest.fn() } };
  service = new UserService(prisma as unknown as PrismaService);
});

describe("UserService.create", () => {
  const input = {
    email: "a@b.com",
    username: "taken",
    passwordHash: "hash",
  };

  it("reports a taken username as UsernameAlreadyUsed", async () => {
    prisma.user.create.mockRejectedValue(
      uniqueViolation({ index: "User_username_key" }),
    );

    await expect(service.create(input)).rejects.toThrow(
      new ConflictException("UsernameAlreadyUsed"),
    );
  });

  it("reports a taken email as EmailAlreadyUsed", async () => {
    prisma.user.create.mockRejectedValue(
      uniqueViolation({ index: "User_email_key" }),
    );

    await expect(service.create(input)).rejects.toThrow(
      new ConflictException("EmailAlreadyUsed"),
    );
  });

  it("recognises the field when the adapter reports fields instead of an index", async () => {
    prisma.user.create.mockRejectedValue(
      uniqueViolation({ fields: ["username"] }),
    );

    await expect(service.create(input)).rejects.toThrow(
      new ConflictException("UsernameAlreadyUsed"),
    );
  });

  it("propagates errors that are not unique-constraint violations", async () => {
    const failure = new Error("connection lost");
    prisma.user.create.mockRejectedValue(failure);

    await expect(service.create(input)).rejects.toBe(failure);
  });
});

describe("UserService.createOAuthUser", () => {
  const input = { email: "a@b.com", username: "taken", githubId: "42" };
  const usernameTaken = () => uniqueViolation({ index: "User_username_key" });
  const usernameOf = (call: number): string => {
    const calls = prisma.user.create.mock.calls as [
      { data: { username: string } },
    ][];
    return calls[call][0].data.username;
  };
  const echoData = ({ data }: { data: unknown }) => Promise.resolve(data);

  it("keeps the provider's username when it is free", async () => {
    prisma.user.create.mockImplementation(echoData);

    await service.createOAuthUser(input);

    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(usernameOf(0)).toBe("taken");
  });

  it("retries with a numeric suffix when the username is taken", async () => {
    prisma.user.create
      .mockRejectedValueOnce(usernameTaken())
      .mockImplementation(echoData);

    await service.createOAuthUser(input);

    expect(prisma.user.create).toHaveBeenCalledTimes(2);
    expect(usernameOf(1)).toMatch(/^taken_\d{4}$/);
  });

  it("keeps a suffixed username within the 50-character limit", async () => {
    prisma.user.create
      .mockRejectedValueOnce(usernameTaken())
      .mockImplementation(echoData);

    await service.createOAuthUser({ ...input, username: "x".repeat(60) });

    expect(usernameOf(1).length).toBeLessThanOrEqual(50);
    expect(usernameOf(1)).toMatch(/_\d{4}$/);
  });

  it("gives up with UsernameAlreadyUsed after repeated clashes", async () => {
    prisma.user.create.mockRejectedValue(usernameTaken());

    await expect(service.createOAuthUser(input)).rejects.toThrow(
      new ConflictException("UsernameAlreadyUsed"),
    );
    expect(prisma.user.create.mock.calls.length).toBeGreaterThan(1);
  });

  it("propagates errors other than a username clash without retrying", async () => {
    const emailTaken = uniqueViolation({ index: "User_email_key" });
    prisma.user.create.mockRejectedValue(emailTaken);

    await expect(service.createOAuthUser(input)).rejects.toBe(emailTaken);
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });
});
