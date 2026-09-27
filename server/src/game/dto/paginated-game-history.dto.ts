import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { GameStatus } from "generated/prisma/enums";

export class GameHistoryItemDto {
  @ApiProperty({ example: "179704b7-b1ea-4862-a7be-4c977e1bec53" })
  id!: string;

  @ApiProperty({ example: "2026-09-14T20:00:00.000Z" })
  createdAt!: Date;

  @ApiProperty({ example: "2026-09-14T20:30:00.000Z" })
  updatedAt!: Date;

  @ApiProperty({ enum: GameStatus, example: GameStatus.FINISHED })
  status!: GameStatus;

  @ApiPropertyOptional({
    type: String,
    example: "be18733a-1b2f-4328-9693-1f0caca0b7e1",
    nullable: true,
  })
  winnerId!: string | null;

  @ApiProperty({ example: '[["w","0","w"...]]' })
  boardStateJson!: string;

  @ApiPropertyOptional({
    type: String,
    example: "be18733a-1b2f-4328-9693-1f0caca0b7e1",
    nullable: true,
  })
  whitePlayerId!: string | null;

  @ApiPropertyOptional({
    type: String,
    example: "YG02k-NvrzXzfFZaAAAB",
    nullable: true,
  })
  blackPlayerId!: string | null;
}

export class PaginatedGameHistoryDto {
  @ApiProperty({ type: [GameHistoryItemDto] })
  games!: GameHistoryItemDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 9 })
  totalPages!: number;
}
