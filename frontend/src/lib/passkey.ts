import { isAxiosError } from "axios";
import { getApiErrorCode } from "@/lib/apiError";
import {
  passkeyControllerLogin,
  passkeyControllerLoginOptions,
  passkeyControllerRegister,
  passkeyControllerRegisterOptions,
} from "../api/endpoints/auth/auth";
import type {
  PasskeyListResponseDto,
  PasskeyOptionsResponseDtoOptions,
} from "../api/models";

/**
 * Passkeys through the native WebAuthn API: options and responses travel as
 * JSON (parse*OptionsFromJSON / toJSON), and the Signal API keeps password
 * managers in step with the server.
 */

export interface PasskeySupport {
  /**
   * WebAuthn with the JSON helpers is present, so passkeys can be added and
   * used. Deliberately not narrowed by getClientCapabilities(): it reports no
   * platform authenticator for e.g. Firefox on Linux, which still creates
   * passkeys on security keys and in password-manager extensions.
   */
  available: boolean;
  /** Passkeys can be suggested in the sign-in form's autofill. */
  conditionalGet: boolean;
}

const UNSUPPORTED: PasskeySupport = { available: false, conditionalGet: false };

function hasNativeJsonApi(): boolean {
  return (
    typeof PublicKeyCredential.getClientCapabilities === "function" &&
    typeof PublicKeyCredential.parseCreationOptionsFromJSON === "function" &&
    typeof PublicKeyCredential.parseRequestOptionsFromJSON === "function" &&
    typeof PublicKeyCredential.prototype.toJSON === "function"
  );
}

let polyfills: Promise<unknown> | null = null;

/**
 * Loads webauthn-polyfills only where getClientCapabilities, the JSON parsers
 * or toJSON are missing, so current browsers never download it. It also fixes
 * Safari 17.4–18.3's misnamed capabilities, and those versions lack the
 * parsers too, so the same check covers them.
 */
function ensurePolyfills(): Promise<unknown> {
  polyfills ??= hasNativeJsonApi() ? Promise.resolve() : import("webauthn-polyfills");
  return polyfills;
}

/** Every passkey UI is gated on this, so the polyfills are in place before use. */
export async function getPasskeySupport(): Promise<PasskeySupport> {
  if (typeof window.PublicKeyCredential !== "function") return UNSUPPORTED;
  await ensurePolyfills();

  const caps = await PublicKeyCredential.getClientCapabilities();
  return {
    available: true,
    conditionalGet: caps.conditionalGet === true,
  };
}

/**
 * The OpenAPI schema types ceremony options as a plain object; the server
 * builds them with @simplewebauthn/server, so they are the WebAuthn JSON types.
 */
function asJson<T>(options: PasskeyOptionsResponseDtoOptions): T {
  return options as unknown as T;
}

interface SignInOptions {
  /** "conditional" offers passkeys in the form's autofill instead of a prompt. */
  mediation?: CredentialMediationRequirement;
  signal?: AbortSignal;
}

/** Runs the passwordless sign-in ceremony; resolves to an access token. */
export async function signInWithPasskey({ mediation, signal }: SignInOptions = {}) {
  const { challengeId, options } = await passkeyControllerLoginOptions(undefined, signal);
  const json = asJson<PublicKeyCredentialRequestOptionsJSON>(options);
  const credential = await navigator.credentials.get({
    publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(json),
    mediation,
    signal,
  });
  if (!(credential instanceof PublicKeyCredential)) throw new Error("PasskeyBrowserError");

  const response = credential.toJSON();
  try {
    const { access_token } = await passkeyControllerLogin({
      challengeId,
      response: { ...response },
    });
    return access_token;
  } catch (err) {
    // The server no longer knows this passkey: ask the manager to drop it.
    if (isAxiosError(err) && err.response?.status === 404) {
      await signalUnknownPasskey(json.rpId, response.id);
    }
    throw err;
  }
}

/** Creates a passkey on this device and saves it to the current account. */
export async function addPasskey(name: string): Promise<void> {
  const { challengeId, options } = await passkeyControllerRegisterOptions();
  const json = asJson<PublicKeyCredentialCreationOptionsJSON>(options);
  const credential = await navigator.credentials.create({
    publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(json),
  });
  if (!(credential instanceof PublicKeyCredential)) throw new Error("PasskeyBrowserError");

  const response = credential.toJSON();
  try {
    await passkeyControllerRegister({ challengeId, response: { ...response }, name });
  } catch (err) {
    // The server rejected it, so the manager would keep an orphaned passkey.
    await signalUnknownPasskey(json.rp.id, response.id);
    throw err;
  }
}

function isBase64Url(value: string): boolean {
  return value.length > 0 && value.length % 4 !== 1 && /^[A-Za-z0-9_-]+$/.test(value);
}

// Signal API calls are passive, best-effort sync with the password manager:
// a failure must never break the flow that triggered it, so it is only warned.

async function signalUnknownPasskey(rpId: string | undefined, credentialId: string) {
  if (!rpId || typeof PublicKeyCredential.signalUnknownCredential !== "function") return;
  try {
    await PublicKeyCredential.signalUnknownCredential({ rpId, credentialId });
  } catch (err) {
    console.warn("signalUnknownCredential failed:", err);
  }
}

/** Tells the password manager which of this account's passkeys still exist. */
export async function syncAcceptedPasskeys({ rpId, userId, passkeys }: PasskeyListResponseDto) {
  if (
    typeof window.PublicKeyCredential !== "function" ||
    typeof PublicKeyCredential.signalAllAcceptedCredentials !== "function"
  ) {
    return;
  }
  const allAcceptedCredentialIds = passkeys.map((p) => p.credentialId);
  if (!isBase64Url(userId) || !allAcceptedCredentialIds.every(isBase64Url)) {
    console.warn("signalAllAcceptedCredentials skipped: IDs are not base64url.");
    return;
  }
  try {
    await PublicKeyCredential.signalAllAcceptedCredentials({
      rpId,
      userId,
      allAcceptedCredentialIds,
    });
  } catch (err) {
    console.warn("signalAllAcceptedCredentials failed:", err);
  }
}

const BROWSERS: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\//, "Opera"],
  [/Firefox\//, "Firefox"],
  [/Chrome\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
  [/Android/, "Android"],
  [/iPhone|iPad/, "iOS"],
  [/Windows/, "Windows"],
  [/Mac OS X/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

/** Default passkey name such as "Chrome on macOS"; the user can change it. */
export function suggestPasskeyName(userAgent = navigator.userAgent): string {
  const browser = BROWSERS.find(([re]) => re.test(userAgent))?.[1];
  const system = SYSTEMS.find(([re]) => re.test(userAgent))?.[1];
  if (browser && system) return `${browser} on ${system}`;
  return browser ?? system ?? "Passkey";
}

/**
 * Error code to show for a failed ceremony, or null when the user dismissed
 * the browser's passkey prompt or the request was aborted (no banner needed).
 */
export function getPasskeyErrorCode(err: unknown): string | null {
  if (err instanceof DOMException) {
    // Cancel, timeout, or "no passkey here" all surface as NotAllowedError.
    if (err.name === "NotAllowedError" || err.name === "AbortError") return null;
    // excludeCredentials matched: this authenticator already has one.
    if (err.name === "InvalidStateError") return "PasskeyAlreadyRegistered";
    return "PasskeyBrowserError";
  }
  return getApiErrorCode(err);
}
