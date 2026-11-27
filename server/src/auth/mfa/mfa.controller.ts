import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { CurrentUser } from "../decorators/current-user.decorator";
import type { AuthUser } from "../auth.types";
import { TokenService } from "../token.service";
import { MfaService } from "./mfa.service";
import { SecondFactorCodeDto, TotpCodeDto } from "./dto/mfa-code.dto";
import { MfaVerifyDto } from "./dto/mfa-verify.dto";
import {
  AccessTokenResponseDto,
  RecoveryCodesResponseDto,
  SecurityStatusDto,
  TotpSetupResponseDto,
} from "./dto/mfa-responses.dto";

@ApiTags("Auth")
@Controller("auth")
export class MfaController {
  constructor(
    private readonly mfaService: MfaService,
    private readonly tokenService: TokenService,
  ) {}

  @Post("2fa/verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Complete a 2FA login with a TOTP/recovery code" })
  @ApiResponse({ status: 200, type: AccessTokenResponseDto })
  @ApiResponse({ status: 400, description: "InvalidTotpCode" })
  @ApiResponse({ status: 401, description: "MfaTokenInvalid" })
  @ApiResponse({ status: 429, description: "TooManyAttempts" })
  async verify(@Body() dto: MfaVerifyDto): Promise<AccessTokenResponseDto> {
    const userId = this.tokenService.verifyMfaToken(dto.mfa_token);
    const user = await this.mfaService.verifySecondFactor(userId, dto.code);
    return {
      access_token: this.tokenService.signAccessToken(user.id, user.email),
    };
  }

  @Get("security")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Current user's 2FA status" })
  @ApiResponse({ status: 200, type: SecurityStatusDto })
  getSecurityStatus(@CurrentUser() user: AuthUser): Promise<SecurityStatusDto> {
    return this.mfaService.getStatus(user.id);
  }

  @Post("2fa/totp/setup")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Start TOTP setup: returns secret and QR code" })
  @ApiResponse({ status: 200, type: TotpSetupResponseDto })
  @ApiResponse({ status: 409, description: "TotpAlreadyEnabled" })
  setupTotp(@CurrentUser() user: AuthUser): Promise<TotpSetupResponseDto> {
    return this.mfaService.startTotpSetup(user.id);
  }

  @Post("2fa/totp/enable")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Confirm TOTP setup with a code; enables 2FA" })
  @ApiResponse({ status: 200, type: RecoveryCodesResponseDto })
  async enableTotp(
    @CurrentUser() user: AuthUser,
    @Body() dto: TotpCodeDto,
  ): Promise<RecoveryCodesResponseDto> {
    return {
      recoveryCodes: await this.mfaService.enableTotp(user.id, dto.code),
    };
  }

  @Post("2fa/totp/disable")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Disable 2FA (needs a TOTP or recovery code)" })
  @ApiResponse({ status: 204 })
  disableTotp(
    @CurrentUser() user: AuthUser,
    @Body() dto: SecondFactorCodeDto,
  ): Promise<void> {
    return this.mfaService.disableTotp(user.id, dto.code);
  }

  @Post("2fa/recovery-codes")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Replace recovery codes (needs a TOTP or recovery code)",
  })
  @ApiResponse({ status: 200, type: RecoveryCodesResponseDto })
  async regenerateRecoveryCodes(
    @CurrentUser() user: AuthUser,
    @Body() dto: SecondFactorCodeDto,
  ): Promise<RecoveryCodesResponseDto> {
    return {
      recoveryCodes: await this.mfaService.regenerateRecoveryCodes(
        user.id,
        dto.code,
      ),
    };
  }
}
