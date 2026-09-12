import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AiModule],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}