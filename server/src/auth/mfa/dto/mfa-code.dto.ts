import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

/** A 6-digit authenticator code, as needed to confirm TOTP setup. */
export class TotpCodeDto {
  @ApiProperty({ example: "123456", description: "6-digit authenticator code" })
  @IsString({ message: "InvalidTotpCode" })
  @Matches(/^\d{6}$/, { message: "InvalidTotpCode" })
  code!: string;
}

/** An authenticator code or a recovery code (`XXXXX-XXXXX`). */
export class SecondFactorCodeDto {
  @ApiProperty({
    example: "123456",
    description: "6-digit authenticator code or a recovery code",
  })
  @IsString({ message: "InvalidTotpCode" })
  @Matches(/^(\d{6}|[0-9A-Za-z]{5}-?[0-9A-Za-z]{5})$/, {
    message: "InvalidTotpCode",
  })
  code!: string;
}
