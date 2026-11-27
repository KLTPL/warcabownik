import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { UserEntity } from "src/user/entities/user.entity";
import { LoginDto } from "./dto/login.dto";
import { LoginResponseDto } from "./dto/login-response.dto";
import { AuthGuard } from "@nestjs/passport";
import type { LoginResult, OAuthRequest } from "./auth.types";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/** Sends 2FA accounts to the code prompt instead of straight into the app. */
function oauthRedirectUrl(result: LoginResult): string {
  return result.mfa_required
    ? `${FRONTEND_URL}/auth/2fa?mfa_token=${result.mfa_token}`
    : `${FRONTEND_URL}/oauth-success?token=${result.access_token}`;
}

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @ApiOperation({
    summary: "Register as a new user",
    description: "Add an expense to the database.",
  })
  @ApiResponse({
    status: 201,
    description: "User registered succesfully",
    type: UserEntity,
  })
  @ApiResponse({
    status: 409,
    description: "Email is already used",
  })
  async register(@Body() dto: RegisterDto): Promise<UserEntity | undefined> {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "User login" })
  @ApiResponse({
    status: 200,
    type: LoginResponseDto,
  })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Get("google")
  @UseGuards(AuthGuard("google"))
  @ApiOperation({ summary: "Redirect to Google OAuth" })
  async googleAuth() {}

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  @ApiOperation({ summary: "Google OAuth callback" })
  async googleAuthRedirect(@Req() req: OAuthRequest, @Res() res: Response) {
    const result = await this.authService.validateOAuthUser(req.user);
    return res.redirect(oauthRedirectUrl(result));
  }

  @Get("github")
  @UseGuards(AuthGuard("github"))
  @ApiOperation({ summary: "Redirect to GitHub OAuth" })
  async githubAuth() {}

  @Get("github/callback")
  @UseGuards(AuthGuard("github"))
  @ApiOperation({ summary: "GitHub OAuth callback" })
  async githubAuthRedirect(@Req() req: OAuthRequest, @Res() res: Response) {
    const result = await this.authService.validateOAuthUser(req.user);
    return res.redirect(oauthRedirectUrl(result));
  }
}
