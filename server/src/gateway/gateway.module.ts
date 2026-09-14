import { Module } from "@nestjs/common";
import { GameGateway } from "./game/game.gateway";
import { GameModule } from "../game/game.module";
import { WsJwtGuard } from "src/auth/guards/ws-jwt-auth.guard";
import { AuthModule } from "src/auth/auth.module";

@Module({
  imports: [GameModule, AuthModule],
  providers: [GameGateway, WsJwtGuard],
})
export class GatewayModule {}
