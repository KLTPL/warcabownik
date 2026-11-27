import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import type { Passkey, User } from "generated/prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { WebAuthnChallengeService } from "./webauthn-challenge.service";
import { WebAuthnConfig } from "./webauthn.config";

export interface CeremonyOptions<T> {
  challengeId: string;
  options: T;
}

export type PasskeySummary = Pick<
  Passkey,
  "id" | "credentialId" | "name" | "createdAt" | "lastUsedAt" | "backedUp"
>;

export interface PasskeyList {
  rpId: string;
  /** Base64url WebAuthn user handle, as registered. */
  userId: string;
  passkeys: PasskeySummary[];
}

/** WebAuthn user handle: stable per user, so one passkey per authenticator. */
function toUserHandle(userId: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(userId);
}

/**
 * Passkey registration and passwordless sign-in. Both ceremonies require user
 * verification (biometric or PIN), so a passkey counts as two factors on its
 * own and sign-in skips the TOTP step.
 *
 * Failures are 400s (404 for an unknown passkey), never 401s: the frontend
 * treats any 401 as an expired session and logs the user out.
 */
@Injectable()
export class PasskeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly challenges: WebAuthnChallengeService,
    @Inject(WebAuthnConfig) private readonly config: WebAuthnConfig,
  ) {}

  async registrationOptions(
    userId: string,
  ): Promise<CeremonyOptions<PublicKeyCredentialCreationOptionsJSON>> {
    const user = await this.findUser(userId);
    const existing = await this.prisma.passkey.findMany({ where: { userId } });

    const options = await generateRegistrationOptions({
      rpName: this.config.rpName,
      rpID: this.config.rpId,
      userName: user.email,
      userDisplayName: user.username,
      // Stable per user, so an authenticator keeps one passkey per account.
      userID: toUserHandle(user.id),
      attestationType: "none",
      excludeCredentials: existing.map((p) => ({
        id: p.credentialId,
        transports: toTransports(p.transports),
      })),
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
    });

    return {
      challengeId: await this.challenges.create(options.challenge, userId),
      options,
    };
  }

  async register(
    userId: string,
    challengeId: string,
    response: RegistrationResponseJSON,
    name: string,
  ): Promise<PasskeySummary> {
    const expectedChallenge = await this.challenges.consume(
      challengeId,
      userId,
    );
    const verification = await this.runVerification(() =>
      verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.config.origin,
        expectedRPID: this.config.rpId,
        requireUserVerification: true,
      }),
    );
    if (!verification.verified) {
      throw new BadRequestException("PasskeyVerificationFailed");
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;
    const passkey = await this.prisma.passkey.create({
      data: {
        userId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports ?? [],
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        name,
      },
    });
    return toSummary(passkey);
  }

  async authenticationOptions(): Promise<
    CeremonyOptions<PublicKeyCredentialRequestOptionsJSON>
  > {
    // No allowCredentials: the authenticator offers its discoverable passkeys.
    const options = await generateAuthenticationOptions({
      rpID: this.config.rpId,
      userVerification: "required",
    });
    return {
      challengeId: await this.challenges.create(options.challenge, null),
      options,
    };
  }

  /** Verifies a passwordless sign-in and returns the user it belongs to. */
  async authenticate(
    challengeId: string,
    response: AuthenticationResponseJSON,
  ): Promise<User> {
    const expectedChallenge = await this.challenges.consume(challengeId, null);
    const passkey = await this.prisma.passkey.findUnique({
      where: { credentialId: response.id },
      include: { user: true },
    });
    // 404 lets the browser tell the password manager to drop this passkey.
    if (!passkey) throw new NotFoundException("PasskeyNotFound");

    const verification = await this.runVerification(() =>
      verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.config.origin,
        expectedRPID: this.config.rpId,
        credential: {
          id: passkey.credentialId,
          publicKey: new Uint8Array(passkey.publicKey),
          counter: passkey.counter,
          transports: toTransports(passkey.transports),
        },
        requireUserVerification: true,
      }),
    );
    if (!verification.verified) {
      throw new BadRequestException("PasskeyVerificationFailed");
    }

    await this.prisma.passkey.update({
      where: { id: passkey.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
        backedUp: verification.authenticationInfo.credentialBackedUp,
        lastUsedAt: new Date(),
      },
    });
    return passkey.user;
  }

  /**
   * The user's passkeys, plus the RP ID and WebAuthn user handle the browser
   * needs to tell password managers which passkeys still exist.
   */
  async list(userId: string): Promise<PasskeyList> {
    const passkeys = await this.prisma.passkey.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return {
      rpId: this.config.rpId,
      userId: Buffer.from(toUserHandle(userId)).toString("base64url"),
      passkeys: passkeys.map(toSummary),
    };
  }

  async rename(
    userId: string,
    passkeyId: string,
    name: string,
  ): Promise<PasskeySummary> {
    const { count } = await this.prisma.passkey.updateMany({
      where: { id: passkeyId, userId },
      data: { name },
    });
    if (count === 0) throw new NotFoundException("PasskeyNotFound");
    const passkey = await this.prisma.passkey.findUniqueOrThrow({
      where: { id: passkeyId },
    });
    return toSummary(passkey);
  }

  async remove(userId: string, passkeyId: string): Promise<void> {
    // Scoped to the owner: another user's id looks exactly like a missing one.
    const { count } = await this.prisma.passkey.deleteMany({
      where: { id: passkeyId, userId },
    });
    if (count === 0) throw new NotFoundException("PasskeyNotFound");
  }

  /**
   * The library throws on malformed or mismatching responses (wrong origin,
   * challenge, signature...). Those are client errors, not server faults.
   */
  private async runVerification<T>(verify: () => Promise<T>): Promise<T> {
    try {
      return await verify();
    } catch (err) {
      throw new BadRequestException("PasskeyVerificationFailed", {
        cause: err,
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

const KNOWN_TRANSPORTS: ReadonlySet<string> =
  new Set<AuthenticatorTransportFuture>([
    "ble",
    "cable",
    "hybrid",
    "internal",
    "nfc",
    "smart-card",
    "usb",
  ]);

/** Stored as plain strings; drops any value this library version can't send. */
function toTransports(values: string[]): AuthenticatorTransportFuture[] {
  return values.filter((v): v is AuthenticatorTransportFuture =>
    KNOWN_TRANSPORTS.has(v),
  );
}

function toSummary(passkey: Passkey): PasskeySummary {
  return {
    id: passkey.id,
    credentialId: passkey.credentialId,
    name: passkey.name,
    createdAt: passkey.createdAt,
    lastUsedAt: passkey.lastUsedAt,
    backedUp: passkey.backedUp,
  };
}
