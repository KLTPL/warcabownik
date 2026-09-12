import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { GameService } from "../../game/game.service";

interface PlayerMovePayload {
  gameId: string;
  from: { y: number; x: number };
  to: { y: number; x: number };
}

@WebSocketGateway({
  cors: {
    origin: "http://localhost:5173",
  },
  namespace: "/game",
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private logger: Logger = new Logger(GameGateway.name);

  constructor(private readonly gameService: GameService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("joinGame")
  async handleJoinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { gameId: string },
  ) {
    await client.join(payload.gameId);
    this.logger.log(`Client ${client.id} joined room: ${payload.gameId}`);
  }

  @SubscribeMessage("sendPlayerMove")
  async handlePlayerMove(
    @MessageBody()
    data: {
      gameId: string;
      move: { fromPosition: string; toPosition: string };
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Received move from ${client.id} for game ${payload.gameId}`,
    );

    const userId = client["user"]?.sub;
    const fromPosition = this.toAlgebraic(payload.from);
    const toPosition = this.toAlgebraic(payload.to);

    try {
      const updatedGame = await this.gameService.playTurn(
        data.gameId,
        userId,
        data.move,
      );

      this.server.to(data.gameId).emit("gameStateUpdate", updatedGame);

      return { status: "success", game: updatedGame };
    } catch (error) {
      this.logger.error(
        `Failed to process move: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.emit("connect_error", { message: error.message });
      return {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private toAlgebraic(pos: { x: number; y: number }): string {
    return `${String.fromCharCode(97 + pos.x)}${pos.y + 1}`;
  }
}
