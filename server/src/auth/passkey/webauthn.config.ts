/**
 * Relying-party identity for WebAuthn. Passkeys are bound to the frontend's
 * domain (the browser runs the ceremony there), so by default everything is
 * derived from FRONTEND_URL.
 */
export class WebAuthnConfig {
  constructor(
    readonly rpId: string,
    readonly rpName: string,
    readonly origin: string,
  ) {}

  static fromEnv(): WebAuthnConfig {
    const origin =
      process.env.WEBAUTHN_ORIGIN ||
      process.env.FRONTEND_URL ||
      "http://localhost:5173";
    return new WebAuthnConfig(
      process.env.WEBAUTHN_RP_ID || new URL(origin).hostname,
      process.env.WEBAUTHN_RP_NAME || "Warcabownik",
      origin,
    );
  }
}
