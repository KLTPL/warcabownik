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
    this.logger.log(`Received move from ${client.id} for game ${data.gameId}`);

    const userId = client["user"]?.sub;

    try {
      const updatedGame = await this.gameService.playTurn(
        data.gameId,
        userId,
        data.move,
      );

      this.server.to(data.gameId).emit("gameStateUpdate", updatedGame);

      return { status: "success", game: updatedGame };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process move: ${errorMessage}`);
      client.emit("connect_error", { message: errorMessage });
      return {
        status: "error",
        message: errorMessage,
      };
    }
  }
}
