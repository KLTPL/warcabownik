import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LoginResponseDto {
  @ApiProperty({
    description:
      "True when the account has 2FA on: exchange `mfa_token` and a code at POST /auth/2fa/verify",
  })
  mfa_required!: boolean;

  @ApiPropertyOptional({
    example: "eyJhbGciOiJIUzI1...",
    description: "JWT Access Token (when `mfa_required` is false)",
  })
  access_token?: string;

  @ApiPropertyOptional({
    example: "eyJhbGciOiJIUzI1...",
    description:
      "Short-lived 2FA challenge token (when `mfa_required` is true)",
  })
  mfa_token?: string;
}
