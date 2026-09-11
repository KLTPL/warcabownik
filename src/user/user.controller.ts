import { Controller, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";

@Controller("user")
@UseGuards(JwtAuthGuard)
export class UserController {}
