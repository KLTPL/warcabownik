import { ConflictException, Injectable } from "@nestjs/common";
import { randomInt } from "node:crypto";
import { Prisma } from "generated/prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { UserEntity } from "./entities/user.entity";
import { NewOAuthUser, OAuthUserDetails } from "src/auth/auth.types";

// Matches RegisterDto's @MaxLength on username.
const USERNAME_MAX_LENGTH = 50;
const OAUTH_USERNAME_ATTEMPTS = 5;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async findByGithubId(githubId: string) {
    return this.prisma.user.findUnique({ where: { githubId } });
  }

  /**
   * The provider's username may already belong to another account, so on a
   * clash retry with a random numeric suffix rather than fail the sign-in.
   */
  async createOAuthUser(dto: NewOAuthUser) {
    for (let attempt = 0; attempt < OAUTH_USERNAME_ATTEMPTS; attempt++) {
      const username =
        attempt === 0 ? dto.username : withRandomSuffix(dto.username);
      try {
        return await this.prisma.user.create({ data: { ...dto, username } });
      } catch (error) {
        if (uniqueViolationField(error) !== "username") throw error;
      }
    }
    throw new ConflictException("UsernameAlreadyUsed");
  }

  async linkOAuthProvider(
    userId: string,
    data: Pick<OAuthUserDetails, "googleId" | "githubId">,
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<UserEntity | undefined> {
    try {
      return await this.prisma.user.create({
        data,
        omit: { passwordHash: true, totpSecretEnc: true },
      });
    } catch (error) {
      switch (uniqueViolationField(error)) {
        case "username":
          throw new ConflictException("UsernameAlreadyUsed");
        case "email":
          throw new ConflictException("EmailAlreadyUsed");
        default:
          throw error;
      }
    }
  }
}

function withRandomSuffix(username: string): string {
  const suffix = `_${randomInt(1000, 10000)}`;
  return username.slice(0, USERNAME_MAX_LENGTH - suffix.length) + suffix;
}

/**
 * Names the User field whose unique constraint the error tripped, or null if
 * it isn't a unique violation on username/email. With the pg driver adapter
 * Prisma doesn't fill `meta.target`; the adapter reports the constraint as
 * `{ index: "User_email_key" }` or `{ fields: ["email"] }`.
 */
function uniqueViolationField(error: unknown): "username" | "email" | null {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return null;
  }
  const meta = error.meta as
    | {
        driverAdapterError?: {
          cause?: { constraint?: { index?: string; fields?: string[] } };
        };
      }
    | undefined;
  const constraint = meta?.driverAdapterError?.cause?.constraint;
  const name = constraint?.index ?? constraint?.fields?.join(",") ?? "";
  if (name.includes("username")) return "username";
  if (name.includes("email")) return "email";
  return null;
}
