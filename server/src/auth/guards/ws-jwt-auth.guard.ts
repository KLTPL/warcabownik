import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io";
import { WsException } from "@nestjs/websockets";
import { JwtPayload, WithSocketUser } from "../auth.types";

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const client = context.switchToWs().getClient<Socket & WithSocketUser>();
      // `handshake.auth` is a free-form bag, so nothing is known about `token`
      // until it has been narrowed.
      const token: unknown = client.handshake.auth.token;

      if (typeof token !== "string" || !token) throw new Error();

      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });

      client.user = { sub: payload.sub };
      return true;
    } catch {
      throw new WsException("Unauthorized");
    }
  }
}
