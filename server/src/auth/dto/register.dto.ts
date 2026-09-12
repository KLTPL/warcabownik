import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  IsPhoneNumber,
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
    description: "First name of the user",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({
    example: "Doe",
    description: "Last name of the user",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({
    example: "+48123456789",
    description: "Unique phone number of the user (preferably in E.164 format)",
  })
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber()
  phoneNumber: string;
}
