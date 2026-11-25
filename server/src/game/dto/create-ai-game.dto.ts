import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { Side } from "@warcabownik/shared";

export class CreateAiGameDto {
  @ApiProperty({
    enum: Side,
    example: Side.WHITE,
    description:
      "Side the human player wants to play as. Defaults to WHITE when omitted.",
    required: false,
  })
  @IsOptional()
  @IsEnum(Side, { message: "InvalidSide" })
  side?: Side;
}
