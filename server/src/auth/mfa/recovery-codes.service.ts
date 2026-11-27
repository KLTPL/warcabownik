import { Injectable } from "@nestjs/common";
import { createHash, randomInt } from "node:crypto";
import { Prisma } from "generated/prisma/client";
import { PrismaService } from "src/prisma/prisma.service";

const CODE_COUNT = 10;
const CODE_HALF_LENGTH = 5;
/** Crockford-style base32 without I, L, O, U, so codes are easy to read back. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Case, spacing and the hyphen are cosmetic, so they never affect a match. */
function normalize(code: string): string {
  return code.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

function hashCode(code: string): string {
  return createHash("sha256").update(normalize(code)).digest("hex");
}

function randomHalf(): string {
  return Array.from(
    { length: CODE_HALF_LENGTH },
    () => ALPHABET[randomInt(ALPHABET.length)],
  ).join("");
}

/** One-time backup codes for when the authenticator app is unavailable. */
@Injectable()
export class RecoveryCodesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Replaces the user's codes with a fresh set and returns them in plaintext;
   * only hashes are stored, so this is the one time they can be shown.
   * Pass `tx` to make the swap part of a larger transaction.
   */
  async regenerate(
    userId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<string[]> {
    const codes = Array.from(
      { length: CODE_COUNT },
      () => `${randomHalf()}-${randomHalf()}`,
    );
    await tx.recoveryCode.deleteMany({ where: { userId } });
    await tx.recoveryCode.createMany({
      data: codes.map((code) => ({ userId, codeHash: hashCode(code) })),
    });
    return codes;
  }

  /** Marks the code used; true only for an unused code of this user. */
  async consume(userId: string, code: string): Promise<boolean> {
    // A conditional update, so two concurrent requests cannot both spend it.
    const { count } = await this.prisma.recoveryCode.updateMany({
      where: { userId, codeHash: hashCode(code), usedAt: null },
      data: { usedAt: new Date() },
    });
    return count > 0;
  }

  countRemaining(userId: string): Promise<number> {
    return this.prisma.recoveryCode.count({ where: { userId, usedAt: null } });
  }
}
