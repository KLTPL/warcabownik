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

@Controller("game")
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @UseGuards(JwtAuthGuard)
  @Post("create-ai")
  async createAiGame(@CurrentUser() user: AuthUser) {
    const game = await this.gameService.createGame(user.id);
    return game;
  }

  @UseGuards(JwtAuthGuard)
  @Get("history")
  async getHistory(
    @CurrentUser() user: AuthUser,
    @Query("page", ParseIntPipe) page: number,
    @Query("limit", ParseIntPipe) limit: number,
  ) {
    return this.gameService.getUserGameHistory(user.id, page || 1, limit || 5);
  }
}
