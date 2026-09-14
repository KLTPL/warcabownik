import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io";
import { WsException } from "@nestjs/websockets";
import { JwtPayload } from "../auth.types";

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      const token = client.handshake.auth.token;

      if (!token) throw new Error();

      const payload: JwtPayload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      client["user"] = { sub: payload.sub };
      return true;
    } catch (err) {
      throw new WsException("Unauthorized WebSocket connection");
    }
  }
}
