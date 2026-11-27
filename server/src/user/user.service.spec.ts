import { ConflictException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UserService } from "./user.service";

describe("UserService.create", () => {
  let service: UserService;
  let prisma: { user: { create: jest.Mock } };

  const input = {
    email: "a@b.com",
    username: "taken",
    passwordHash: "hash",
  };

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

  beforeEach(() => {
    prisma = { user: { create: jest.fn() } };
    service = new UserService(prisma as unknown as PrismaService);
  });

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
