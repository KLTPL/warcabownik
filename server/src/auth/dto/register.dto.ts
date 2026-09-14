import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MinLength,
  MaxLength,
} from "class-validator";

export class RegisterDto {
  @ApiProperty({
    example: "contact@example.com",
    description: "Unique email of the user",
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: "i-DO-pieca67!",
    description:
      "Strong user password (min 10 length, min 1 number, min 1 lowercase, min 1 symbol, min 1 uppercase)",
  })
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword({
    minLength: 10,
    minNumbers: 1,
    minLowercase: 1,
    minSymbols: 1,
    minUppercase: 1,
  })
  password: string;

  @ApiProperty({
    example: "John",
    description: "Username of the user",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  username: string;
}
