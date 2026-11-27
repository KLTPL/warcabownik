import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtPayload, MfaTokenPayload } from "./auth.types";

/**
 * Audiences keep the two token kinds apart: an MFA challenge token proves only
 * that the password (or OAuth) step passed, so it must never be accepted where
 * an access token is expected, and vice versa.
 */
export const ACCESS_TOKEN_AUDIENCE = "access";
export const MFA_TOKEN_AUDIENCE = "mfa";

const MFA_TOKEN_TTL_SECONDS = 5 * 60;

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(userId: string, email: string): string {
    const payload: Omit<JwtPayload, "exp" | "iat" | "aud"> = {
      sub: userId,
      email,
    };
    return this.jwtService.sign(payload, {
      expiresIn: parseInt(process.env.EXPIRY_TIME_MS as string) / 1000,
      secret: process.env.JWT_SECRET as string,
      audience: ACCESS_TOKEN_AUDIENCE,
    });
  }

  signMfaToken(userId: string): string {
    const payload: Pick<MfaTokenPayload, "sub"> = { sub: userId };
    return this.jwtService.sign(payload, {
      expiresIn: MFA_TOKEN_TTL_SECONDS,
      secret: process.env.JWT_SECRET as string,
      audience: MFA_TOKEN_AUDIENCE,
    });
  }

  /** Returns the user id the MFA challenge was issued for. */
  verifyMfaToken(token: string): string {
    try {
      const payload = this.jwtService.verify<MfaTokenPayload>(token, {
        secret: process.env.JWT_SECRET as string,
        audience: MFA_TOKEN_AUDIENCE,
      });
      return payload.sub;
    } catch {
      // Expired, malformed, wrong audience or bad signature all mean the
      // client has to restart the login from the first factor.
      throw new UnauthorizedException("MfaTokenInvalid");
    }
  }
}
