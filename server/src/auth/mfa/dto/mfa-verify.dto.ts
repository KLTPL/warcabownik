import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import { SecondFactorCodeDto } from "./mfa-code.dto";

export class MfaVerifyDto extends SecondFactorCodeDto {
  @ApiProperty({
    example: "eyJhbGciOiJIUzI1...",
    description: "Challenge token returned by a login that requires 2FA",
  })
  @IsString({ message: "MfaTokenInvalid" })
  @IsNotEmpty({ message: "MfaTokenInvalid" })
  mfa_token!: string;
}
