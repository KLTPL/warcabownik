import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { RegisterDto } from "./dto/register.dto";
import { UserService } from "src/user/user.service";
import { UserEntity } from "src/user/entities/user.entity";
import { LoginDto } from "./dto/login.dto";
import { JwtService } from "@nestjs/jwt";
import { JwtPayload, OAuthUserDetails } from "./auth.types";
import { User } from "generated/prisma/client";

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
    const ERR_MESSAGE = "InvalidCredentials";
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user || !user.passwordHash) {
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

  async validateOAuthUser(details: OAuthUserDetails) {
    let user: User | null = null;
    if (details.googleId) {
      user = await this.userService.findByGoogleId(details.googleId);
    } else if (details.githubId) {
      user = await this.userService.findByGithubId(details.githubId);
    }
    if (!user && details.email) {
      user = await this.userService.findByEmail(details.email);
      if (user) {
        await this.userService.linkOAuthProvider(user.id, {
          googleId: details.googleId,
          githubId: details.githubId,
        });
      }
    }
    if (!user) {
      if (!details.email) {
        throw new UnauthorizedException("OAuthEmailUnavailable");
      }
      user = await this.userService.createOAuthUser({
        email: details.email,
        username: details.username,
        googleId: details.googleId,
        githubId: details.githubId,
      });
    }
    return this.generateJwtToken(user.id, user.email);
  }

  private generateJwtToken(userId: string, email: string) {
    const payload: Omit<JwtPayload, "exp" | "iat"> = {
      sub: userId,
      email: email,
    };
    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: parseInt(process.env.EXPIRY_TIME_MS as string) / 1000,
        secret: process.env.JWT_SECRET as string,
      }),
    };
  }
}
