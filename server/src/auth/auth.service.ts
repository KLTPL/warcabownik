import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { RegisterDto } from "./dto/register.dto";
import { UserService } from "src/user/user.service";
import { UserEntity } from "src/user/entities/user.entity";
import { LoginDto } from "./dto/login.dto";
import { JwtService } from "@nestjs/jwt";
import { JwtPayload } from "./auth.types";

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<UserEntity | undefined> {
    const { password, ...userData } = registerDto;
    const passwordHash = await bcrypt.hash(password, 10);
    return this.userService.create({
      ...userData,
      passwordHash,
    });
  }

  async login(loginDto: LoginDto) {
    const ERR_MESSAGE = "Wrong email or password";
    const user = await this.userService.findByEmail(loginDto.email);
    if (user === null) {
      throw new UnauthorizedException(ERR_MESSAGE);
    }
    const isCorrect = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isCorrect) {
      throw new UnauthorizedException(ERR_MESSAGE);
    }

    const payload: Omit<JwtPayload, "exp" | "iat"> = {
      sub: user.id,
      email: user.email,
    };
    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: parseInt(process.env.EXPIRY_TIME_MS as string) / 1000,
        secret: process.env.JWT_SECRET as string,
      }),
    };
  }
}
