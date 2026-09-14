import { Request } from "express";

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export type JwtPayload = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
};
