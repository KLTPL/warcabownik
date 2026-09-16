import { ApiProperty } from "@nestjs/swagger";

export class LoginResponseDto {
  @ApiProperty({
    example: "eyJhbGciOiJIUzI1...",
    description: "JWT Access Token",
  })
  access_token: string;
}
