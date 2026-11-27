import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

export const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/**
 * Stores WebAuthn challenges server-side so each one can be answered exactly
 * once. Kept in the database rather than memory so a restart or a second
 * server instance does not break a ceremony in progress.
 */
@Injectable()
export class WebAuthnChallengeService {
  constructor(private readonly prisma: PrismaService) {}

  /** Saves a challenge; `userId` is null for passwordless sign-in. */
  async create(challenge: string, userId: string | null): Promise<string> {
    // The sign-in endpoint is public, so prune abandoned challenges as we go.
    await this.prisma.webAuthnChallenge.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    const { id } = await this.prisma.webAuthnChallenge.create({
      data: {
        challenge,
        userId,
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
      },
    });
    return id;
  }

  /**
   * Deletes the challenge and returns its value. Fails unless it exists, has
   * not expired, and belongs to `userId` (null: a sign-in challenge).
   */
  async consume(id: string, userId: string | null): Promise<string> {
    const row = await this.prisma.webAuthnChallenge.findUnique({
      where: { id },
    });
    // Only the request whose delete wins may use it, so it cannot be replayed.
    const { count } = await this.prisma.webAuthnChallenge.deleteMany({
      where: { id },
    });
    if (
      !row ||
      count === 0 ||
      row.userId !== userId ||
      row.expiresAt <= new Date()
    ) {
      throw new BadRequestException("ChallengeExpired");
    }
    return row.challenge;
  }
}
