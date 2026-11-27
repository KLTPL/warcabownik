import { Injectable } from "@nestjs/common";
import { generateSecret, generateURI, verify } from "otplib";
import { toDataURL } from "qrcode";

const ISSUER = "Warcabownik";
const TOTP_CODE_PATTERN = /^\d{6}$/;
/**
 * Seconds of clock drift tolerated in each direction (one 30 s step), the
 * usual allowance for phone clocks and the time it takes to type the code.
 */
const EPOCH_TOLERANCE_SECONDS = 30;

export function isTotpCodeFormat(code: string): boolean {
  return TOTP_CODE_PATTERN.test(code);
}

/** Thin wrapper over otplib so the rest of the module never touches it. */
@Injectable()
export class TotpService {
  generateSecret(): string {
    return generateSecret();
  }

  buildOtpauthUrl(secret: string, accountEmail: string): string {
    return generateURI({ issuer: ISSUER, label: accountEmail, secret });
  }

  toQrCodeDataUrl(otpauthUrl: string): Promise<string> {
    return toDataURL(otpauthUrl);
  }

  /**
   * Checks `code` against `secret`. Returns the matched time step (store it to
   * block replays), or null when the code is wrong or from a step at or
   * before `afterTimeStep`.
   */
  async verify(
    secret: string,
    code: string,
    afterTimeStep: number | null,
  ): Promise<number | null> {
    // otplib throws on anything that is not exactly six digits.
    if (!isTotpCodeFormat(code)) return null;

    const result = await verify({
      secret,
      token: code,
      epochTolerance: EPOCH_TOLERANCE_SECONDS,
      afterTimeStep: afterTimeStep ?? undefined,
    });
    // The functional API types its result as TOTP | HOTP; only TOTP's carries
    // the matched time step.
    if (!result.valid || !("timeStep" in result)) return null;
    return result.timeStep;
  }
}
