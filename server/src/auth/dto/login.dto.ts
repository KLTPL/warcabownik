import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsEmail } from "class-validator";

export class LoginDto {
  @ApiProperty({
    example: "contact@example.com",
    description: "Unique email of the user",
  })
  @IsString({ message: "InvalidEmail" })
  @IsNotEmpty({ message: "InvalidEmail" })
  @IsEmail({}, { message: "InvalidEmail" })
  email: string;

  @ApiProperty({
    example: "i-DO-pieca67",
  })
  @IsString({ message: "InvalidCredentials" })
  @IsNotEmpty({ message: "InvalidCredentials" })
  password: string;
}
