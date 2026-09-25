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
  @IsString({ message: "InvalidEmail" })
  @IsNotEmpty({ message: "InvalidEmail" })
  @IsEmail({}, { message: "InvalidEmail" })
  email!: string;

  @ApiProperty({
    example: "i-DO-pieca67!",
    description:
      "Strong user password (min 10 length, min 1 number, min 1 lowercase, min 1 symbol, min 1 uppercase)",
  })
  @IsString({ message: "WeakPassword" })
  @IsNotEmpty({ message: "WeakPassword" })
  @IsStrongPassword(
    {
      minLength: 10,
      minNumbers: 1,
      minLowercase: 1,
      minSymbols: 1,
      minUppercase: 1,
    },
    { message: "WeakPassword" },
  )
  password!: string;

  @ApiProperty({
    example: "John",
    description: "Username of the user",
  })
  @IsString({ message: "UsernameTooShort" })
  @IsNotEmpty({ message: "UsernameTooShort" })
  @MinLength(2, { message: "UsernameTooShort" })
  @MaxLength(50, { message: "UsernameTooLong" })
  username!: string;
}
