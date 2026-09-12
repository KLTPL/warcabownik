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

interface PlayerMovePayload {
  gameId: string;
  from: { y: number; x: number };
  to: { y: number; x: number };
}

@WebSocketGateway({
  cors: {
    origin: "*",
  },
  namespace: "/game",
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger(GameGateway.name);

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
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PlayerMovePayload,
  ) {
    this.logger.log(
      `Received move from ${client.id} for game ${payload.gameId}`,
    );
    this.logger.log(
      `Move details: from ${JSON.stringify(payload.from)} to ${JSON.stringify(payload.to)}`,
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockedBotMove = {
      from: { y: 2, x: 1 },
      to: { y: 3, x: 2 },
    };

    const mockGameState = {
      gameId: payload.gameId,
      status: "IN_PROGRESS",
      lastMoveByPlayer: payload,
      botMove: mockedBotMove,
      message: "Turn processed. Bot has responded.",
    };

    this.server.to(payload.gameId).emit("gameStateUpdate", mockGameState);

    return { status: "success" };
  }
}
