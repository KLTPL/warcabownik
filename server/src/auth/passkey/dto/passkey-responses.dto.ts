import { ApiProperty } from "@nestjs/swagger";

export class PasskeyOptionsResponseDto {
  @ApiProperty({ description: "Send back with the matching verify call" })
  challengeId!: string;

  @ApiProperty({
    type: "object",
    additionalProperties: true,
    description:
      "PublicKeyCredential{Creation,Request}OptionsJSON for PublicKeyCredential.parse*OptionsFromJSON()",
  })
  options!: Record<string, unknown>;
}

export class PasskeyDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    description: "Base64url WebAuthn credential ID (for the Signal API)",
  })
  credentialId!: string;

  @ApiProperty({ example: "MacBook Touch ID" })
  name!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: Date, nullable: true })
  lastUsedAt!: Date | null;

  @ApiProperty({
    description: "Synced to a cloud account (survives a lost device)",
  })
  backedUp!: boolean;
}

export class PasskeyListResponseDto {
  @ApiProperty({ example: "localhost", description: "WebAuthn RP ID" })
  rpId!: string;

  @ApiProperty({ description: "Base64url WebAuthn user handle" })
  userId!: string;

  @ApiProperty({ type: [PasskeyDto] })
  passkeys!: PasskeyDto[];
}
