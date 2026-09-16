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
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import { GameService } from "../../game/game.service";
import { CORS_ORIGIN } from "../../game/game.constants";
import { WsJwtGuard } from "src/auth/guards/ws-jwt-auth.guard";
import {
  ClientToServerEvents,
  MovePayload,
  ServerToClientEvents,
  SocketEvents,
  SocketStatus,
} from "@warcabownik/shared";

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface AuthenticatedSocket extends TypedSocket {
  user?: {
    sub: string;
  };
}

@Catch()
export class WsAuthExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();

    let errorMessage = "Unauthorized";
    let statusCode = 401;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      errorMessage = exception.message;
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
    }

    client.emit("exception", {
      message: errorMessage,
      statusCode: statusCode,
    });
  }
}

@WebSocketGateway({
  cors: {
    origin: CORS_ORIGIN,
  },
  namespace: "/game",
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents>;

  private readonly logger = new Logger(GameGateway.name);

  constructor(private readonly gameService: GameService) {}

  handleConnection(client: TypedSocket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: TypedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(SocketEvents.JOIN_GAME)
  async handleJoinGame(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() payload: { gameId: string },
  ) {
    await client.join(payload.gameId);
    this.logger.log(`Client ${client.id} joined room: ${payload.gameId}`);

    try {
      const game = await this.gameService.getGameById(payload.gameId);
      client.emit(SocketEvents.GAME_STATE_UPDATE, game);

      const autoUpdatedGame = await this.gameService.checkAndTriggerAi(
        payload.gameId,
      );

      if (autoUpdatedGame) {
        this.server
          .to(payload.gameId)
          .emit(SocketEvents.GAME_STATE_UPDATE, autoUpdatedGame);
      }
    } catch (error) {
      this.logger.error(
        `Failed to fetch game state for room: ${payload.gameId}`,
      );
    }
  }

  @UseGuards(WsJwtGuard)
  @UseFilters(new WsAuthExceptionFilter())
  @SubscribeMessage(SocketEvents.SEND_PLAYER_MOVE)
  async handlePlayerMove(
    @MessageBody() data: { gameId: string; move: MovePayload },
    @ConnectedSocket() client: TypedSocket,
  ) {
    this.logger.log(`Received move from ${client.id} for game ${data.gameId}`);

    const authClient = client as AuthenticatedSocket;
    const userId = authClient.user?.sub ?? "";

    try {
      const updatedGame = await this.gameService.playTurn(
        data.gameId,
        userId,
        data.move,
      );

      this.server
        .to(data.gameId)
        .emit(SocketEvents.GAME_STATE_UPDATE, updatedGame);

      return { status: SocketStatus.SUCCESS, game: updatedGame };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process move: ${errorMessage}`);

      client.emit(SocketEvents.MOVE_ERROR, { message: errorMessage });

      return {
        status: SocketStatus.ERROR,
        message: errorMessage,
      };
    }
  }
}
