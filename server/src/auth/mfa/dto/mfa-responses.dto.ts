import { ApiProperty } from "@nestjs/swagger";

export class SecurityStatusDto {
  @ApiProperty()
  totpEnabled!: boolean;

  @ApiProperty({ description: "Unused recovery codes left" })
  recoveryCodesRemaining!: number;
}

export class TotpSetupResponseDto {
  @ApiProperty({ example: "otpauth://totp/Warcabownik:me%40example.com?..." })
  otpauthUrl!: string;

  @ApiProperty({ description: "PNG data URL of the otpauth QR code" })
  qrCodeDataUrl!: string;

  @ApiProperty({
    example: "JBSWY3DPEHPK3PXP",
    description: "Base32 secret for manual entry",
  })
  secret!: string;
}

export class RecoveryCodesResponseDto {
  @ApiProperty({
    type: [String],
    example: ["7K2QD-M9XRT"],
    description: "Shown once; only hashes are stored",
  })
  recoveryCodes!: string[];
}

export class AccessTokenResponseDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1..." })
  access_token!: string;
}
