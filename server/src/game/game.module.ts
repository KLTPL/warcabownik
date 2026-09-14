import { Module } from "@nestjs/common";
import { GameService } from "./game.service";
import { GameValidatorService } from "./game-validator.service";
import { AiModule } from "../ai/ai.module";
import { PrismaModule } from "../prisma/prisma.module";
import { GameController } from "./game.controller";

@Module({
  imports: [PrismaModule, AiModule],
  providers: [GameService, GameValidatorService],
  exports: [GameService, GameValidatorService],
  controllers: [GameController],
})
export class GameModule {}
