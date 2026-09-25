import { ApiProperty } from "@nestjs/swagger";

export class UserEntity {
  @ApiProperty({
    example: "contact@example.com",
    description: "Unique email of the user",
  })
  email!: string;

  @ApiProperty({
    example: "John",
    description: "Username of the user",
  })
  username!: string;
  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
