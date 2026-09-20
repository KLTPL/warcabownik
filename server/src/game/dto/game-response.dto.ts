import { ApiProperty } from "@nestjs/swagger";
import { GameStatus } from "generated/prisma/enums";

export class GameResponseDto {
  @ApiProperty({
    example: "cm11x...",
    description: "Unique identifier of the game",
  })
  id: string;

  @ApiProperty({ example: "2026-09-15T12:00:00Z" })
  createdAt: Date;

  @ApiProperty({ example: "2026-09-15T12:00:00Z" })
  updatedAt: Date;

  @ApiProperty({ enum: GameStatus, example: "WAITING_FOR_PLAYERS" })
  status: GameStatus;

  @ApiProperty({ type: String, nullable: true, example: null })
  winnerId: string | null;

  @ApiProperty({
    example: '{"board": [...]}',
    description: "Serialized board state",
  })
  boardStateJson: string;

  @ApiProperty({ type: String, nullable: true, example: "uuid-1234" })
  whitePlayerId: string | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  blackPlayerId: string | null;
}
