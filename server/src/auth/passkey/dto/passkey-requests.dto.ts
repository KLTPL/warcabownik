import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsString, IsUUID, Length } from "class-validator";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

/**
 * The WebAuthn `response` objects are only shape-checked here; the
 * SimpleWebAuthn verifiers validate every field cryptographically.
 */

export class PasskeyRenameDto {
  @ApiProperty({ example: "MacBook Touch ID", minLength: 1, maxLength: 50 })
  @IsString({ message: "PasskeyNameInvalid" })
  @Length(1, 50, { message: "PasskeyNameInvalid" })
  name!: string;
}

export class PasskeyRegisterDto extends PasskeyRenameDto {
  @ApiProperty({ description: "challengeId from register/options" })
  @IsUUID("4", { message: "ChallengeExpired" })
  challengeId!: string;

  @ApiProperty({
    type: "object",
    additionalProperties: true,
    description:
      "PublicKeyCredential.toJSON() of navigator.credentials.create()",
  })
  @IsObject({ message: "PasskeyVerificationFailed" })
  response!: RegistrationResponseJSON;
}

export class PasskeyLoginDto {
  @ApiProperty({ description: "challengeId from login/options" })
  @IsUUID("4", { message: "ChallengeExpired" })
  challengeId!: string;

  @ApiProperty({
    type: "object",
    additionalProperties: true,
    description: "PublicKeyCredential.toJSON() of navigator.credentials.get()",
  })
  @IsObject({ message: "PasskeyVerificationFailed" })
  response!: AuthenticationResponseJSON;
}
