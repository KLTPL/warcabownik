/**
 * Claims the backend puts in its access tokens (see `server/src/auth`).
 * Every field is optional here because the token is attacker-controlled input
 * as far as the browser is concerned — it is only ever read for UI hints,
 * never trusted for authorisation.
 */
export interface JwtPayload {
  sub?: string;
  email?: string;
  iat?: number;
  exp?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Decodes a JWT's payload, or returns null if it is not readable. */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payloadBase64 = token.split(".")[1];
    const decoded: unknown = JSON.parse(atob(payloadBase64));
    if (!isRecord(decoded)) return null;

    return {
      sub: typeof decoded.sub === "string" ? decoded.sub : undefined,
      email: typeof decoded.email === "string" ? decoded.email : undefined,
      iat: typeof decoded.iat === "number" ? decoded.iat : undefined,
      exp: typeof decoded.exp === "number" ? decoded.exp : undefined,
    };
  } catch {
    return null;
  }
}

/** True when the token cannot be read or its `exp` claim is in the past. */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  if (!payload.exp) return false;
  return payload.exp * 1000 < Date.now();
}
