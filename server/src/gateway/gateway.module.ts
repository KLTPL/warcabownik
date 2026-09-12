import { Module } from "@nestjs/common";
import { GameGateway } from "./game/game.gateway";

@Module({
  providers: [GameGateway],
})
export class GatewayModule {}
