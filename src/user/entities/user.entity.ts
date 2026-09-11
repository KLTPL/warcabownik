import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "generated/prisma/enums";

export class UserEntity {
  @ApiProperty({
    example: "contact@example.com",
    description: "Unique email of the user",
  })
  email: string;

  @ApiProperty({
    example: "John",
    description: "First name of the user",
  })
  firstName: string;

  @ApiProperty({
    example: "Doe",
    description: "Last name of the user",
  })
  lastName: string;

  @ApiProperty({
    example: "+48123456789",
    description: "Unique phone number of the user (preferably in E.164 format)",
  })
  phoneNumber: string;

  @ApiProperty({ enum: ["USER", "ADMIN"], example: "USER" })
  role: UserRole;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
