import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { RegisterDto } from "./dto/register.dto";
import { UserService } from "src/user/user.service";
import { UserEntity } from "src/user/entities/user.entity";
import { LoginDto } from "./dto/login.dto";
import { LoginResult, OAuthUserDetails } from "./auth.types";
import { User } from "generated/prisma/client";
import { TokenService } from "./token.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  async register(registerDto: RegisterDto): Promise<UserEntity | undefined> {
    const { password, ...userData } = registerDto;
    const passwordHash = await bcrypt.hash(password, 10);
    return this.userService.create({
      ...userData,
      passwordHash,
    });
  }

  async login(loginDto: LoginDto): Promise<LoginResult> {
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

    return this.completeFirstFactor(user);
  }

  async validateOAuthUser(details: OAuthUserDetails): Promise<LoginResult> {
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
    return this.completeFirstFactor(user);
  }

  /** 2FA applies to every login path, so all of them end here. */
  private completeFirstFactor(user: User): LoginResult {
    if (user.totpEnabled) {
      return {
        mfa_required: true,
        mfa_token: this.tokenService.signMfaToken(user.id),
      };
    }
    return {
      mfa_required: false,
      access_token: this.tokenService.signAccessToken(user.id, user.email),
    };
  }
}
