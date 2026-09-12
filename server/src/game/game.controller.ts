import { Controller, Post, UseGuards, Request } from "@nestjs/common";
import { GameService } from "./game.service";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { JwtPayload } from "src/auth/strategies/jwt.strategy";
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
@Controller("game")
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @UseGuards(JwtAuthGuard)
  @Post("create-ai")
  async createAiGame(@Request() req: AuthenticatedRequest) {
    const game = await this.gameService.createGame(req.user.sub);
    return game;
  }
}
