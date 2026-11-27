import { Request } from "express";

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export type JwtPayload = {
  sub: string;
  email: string;
  aud: string;
  iat: number;
  exp: number;
};

/** Short-lived token proving the first login factor passed. */
export type MfaTokenPayload = {
  sub: string;
  aud: string;
  iat: number;
  exp: number;
};

/**
 * Outcome of a first-factor login: either the session is ready, or the user
 * has 2FA on and must exchange `mfa_token` plus a code for an access token.
 */
export type LoginResult =
  | { mfa_required: false; access_token: string }
  | { mfa_required: true; mfa_token: string };

/**
 * Identity an OAuth strategy hands to Passport, which then exposes it as
 * `req.user` on the provider's callback route. GitHub accounts may hide every
 * e-mail address, so it is not guaranteed to be present.
 */
export interface OAuthUserDetails {
  email: string | null;
  username: string;
  googleId?: string;
  githubId?: string;
}

/** An OAuth identity complete enough to create a user record from. */
export type NewOAuthUser = OAuthUserDetails & { email: string };

/**
 * Passport's `verified` callback, narrowed to what the strategies here pass
 * back. `passport-github2` does not publish its own, so it is spelled out.
 */
export type OAuthVerifyCallback = (
  err: Error | null,
  user?: OAuthUserDetails,
) => void;

export interface OAuthRequest extends Request {
  user: OAuthUserDetails;
}

/** Identity the WS JWT guard attaches to an authenticated socket. */
export interface SocketUser {
  sub: string;
}

/** Mixed into a socket type once `WsJwtGuard` may have populated it. */
export interface WithSocketUser {
  user?: SocketUser;
}
