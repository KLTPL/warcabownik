import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { User } from "generated/prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { SecretCipher } from "./secret-cipher";
import { TotpService, isTotpCodeFormat } from "./totp.service";
import { RecoveryCodesService } from "./recovery-codes.service";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

export interface SecurityStatus {
  totpEnabled: boolean;
  recoveryCodesRemaining: number;
}

export interface TotpSetup {
  otpauthUrl: string;
  qrCodeDataUrl: string;
  secret: string;
}

/**
 * TOTP two-factor lifecycle (setup → enable → verify → disable) plus the
 * brute-force lockout shared by every place a second factor is checked.
 *
 * Wrong codes are 400s, not 401s: the frontend treats any 401 as an expired
 * session and logs the user out.
 */
@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly totp: TotpService,
    private readonly recoveryCodes: RecoveryCodesService,
    @Inject(SecretCipher) private readonly cipher: SecretCipher,
  ) {}

  async getStatus(userId: string): Promise<SecurityStatus> {
    const user = await this.findUser(userId);
    return {
      totpEnabled: user.totpEnabled,
      recoveryCodesRemaining: user.totpEnabled
        ? await this.recoveryCodes.countRemaining(userId)
        : 0,
    };
  }

  /**
   * Stores a fresh, not-yet-active secret. Calling it again before enabling
   * simply replaces the pending secret (e.g. the user lost the QR code).
   */
  async startTotpSetup(userId: string): Promise<TotpSetup> {
    const user = await this.findUser(userId);
    if (user.totpEnabled) throw new ConflictException("TotpAlreadyEnabled");

    const secret = this.totp.generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpSecretEnc: this.cipher.encrypt(secret),
        totpLastUsedStep: null,
      },
    });

    const otpauthUrl = this.totp.buildOtpauthUrl(secret, user.email);
    return {
      otpauthUrl,
      qrCodeDataUrl: await this.totp.toQrCodeDataUrl(otpauthUrl),
      secret,
    };
  }

  /** Activates the pending secret; returns the first set of recovery codes. */
  async enableTotp(userId: string, code: string): Promise<string[]> {
    const user = await this.findUser(userId);
    if (user.totpEnabled) throw new ConflictException("TotpAlreadyEnabled");
    if (!user.totpSecretEnc) throw new BadRequestException("TotpSetupMissing");

    const step = await this.totp.verify(
      this.cipher.decrypt(user.totpSecretEnc),
      code,
      null,
    );
    if (step === null) throw new BadRequestException("InvalidTotpCode");

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          totpEnabled: true,
          totpLastUsedStep: step,
          mfaFailedAttempts: 0,
          mfaLockedUntil: null,
        },
      });
      return this.recoveryCodes.regenerate(userId, tx);
    });
  }

  async disableTotp(userId: string, code: string): Promise<void> {
    await this.verifySecondFactor(userId, code);
    await this.prisma.$transaction([
      this.prisma.recoveryCode.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          totpEnabled: false,
          totpSecretEnc: null,
          totpLastUsedStep: null,
        },
      }),
    ]);
  }

  async regenerateRecoveryCodes(
    userId: string,
    code: string,
  ): Promise<string[]> {
    await this.verifySecondFactor(userId, code);
    return this.recoveryCodes.regenerate(userId);
  }

  /**
   * Accepts a current TOTP code or an unused recovery code. Locks the second
   * factor for {@link LOCKOUT_MS} after {@link MAX_FAILED_ATTEMPTS} misses.
   */
  async verifySecondFactor(userId: string, code: string): Promise<User> {
    const user = await this.findUser(userId);
    if (!user.totpEnabled || !user.totpSecretEnc) {
      throw new BadRequestException("TotpNotEnabled");
    }
    if (user.mfaLockedUntil && user.mfaLockedUntil > new Date()) {
      throw new HttpException("TooManyAttempts", HttpStatus.TOO_MANY_REQUESTS);
    }

    const accepted = isTotpCodeFormat(code)
      ? await this.acceptTotpCode(user, user.totpSecretEnc, code)
      : await this.recoveryCodes.consume(userId, code);

    if (!accepted) {
      await this.recordFailedAttempt(userId);
      throw new BadRequestException("InvalidTotpCode");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaFailedAttempts: 0, mfaLockedUntil: null },
    });
    return user;
  }

  /** Verifies the code and atomically claims its time step against replays. */
  private async acceptTotpCode(
    user: User,
    secretEnc: string,
    code: string,
  ): Promise<boolean> {
    const step = await this.totp.verify(
      this.cipher.decrypt(secretEnc),
      code,
      user.totpLastUsedStep,
    );
    if (step === null) return false;

    // Conditional on the step still being newer, so two concurrent logins
    // with the same code cannot both succeed.
    const { count } = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        OR: [{ totpLastUsedStep: null }, { totpLastUsedStep: { lt: step } }],
      },
      data: { totpLastUsedStep: step },
    });
    return count > 0;
  }

  private async recordFailedAttempt(userId: string): Promise<void> {
    const { mfaFailedAttempts } = await this.prisma.user.update({
      where: { id: userId },
      data: { mfaFailedAttempts: { increment: 1 } },
    });
    if (mfaFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          mfaFailedAttempts: 0,
          mfaLockedUntil: new Date(Date.now() + LOCKOUT_MS),
        },
      });
    }
  }

  private async findUser(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    // The token outlived its account; treat it like any other bad token.
    if (!user) throw new UnauthorizedException("InvalidToken");
    return user;
  }
}
