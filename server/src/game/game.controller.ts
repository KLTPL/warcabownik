import {
  Controller,
  Post,
  UseGuards,
  Get,
  Query,
  ParseIntPipe,
} from "@nestjs/common";
import { GameService } from "./game.service";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { type AuthUser } from "src/auth/auth.types";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { PaginatedGameHistoryDto } from "./dto/paginated-game-history.dto";
import { GameResponseDto } from "./dto/game-response.dto";

@ApiBearerAuth()
@ApiTags("Game")
@UseGuards(JwtAuthGuard)
@Controller("game")
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post("create-ai")
  @ApiOperation({ summary: "Create a new game against the AI" })
  @ApiResponse({
    status: 201,
    description: "Game successfully created",
    type: GameResponseDto,
  })
  async createAiGame(@CurrentUser() user: AuthUser): Promise<GameResponseDto> {
    const game = await this.gameService.createGame(user.id);
    return game;
  }

  @Get("history")
  @ApiOperation({ summary: "Get paginated game history of a particular user" })
  @ApiResponse({
    status: 200,
    description: "Games fetched",
    type: PaginatedGameHistoryDto,
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getHistory(
    @CurrentUser() user: AuthUser,
    @Query("page", new ParseIntPipe({ optional: true })) page?: number,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<PaginatedGameHistoryDto> {
    return this.gameService.getUserGameHistory(user.id, page ?? 1, limit ?? 5);
  }
}
