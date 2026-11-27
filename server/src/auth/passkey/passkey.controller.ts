import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { CurrentUser } from "../decorators/current-user.decorator";
import type { AuthUser } from "../auth.types";
import { TokenService } from "../token.service";
import { AccessTokenResponseDto } from "../mfa/dto/mfa-responses.dto";
import {
  type CeremonyOptions,
  type PasskeyList,
  type PasskeySummary,
  PasskeyService,
} from "./passkey.service";
import {
  PasskeyLoginDto,
  PasskeyRegisterDto,
  PasskeyRenameDto,
} from "./dto/passkey-requests.dto";
import {
  PasskeyDto,
  PasskeyListResponseDto,
  PasskeyOptionsResponseDto,
} from "./dto/passkey-responses.dto";

@ApiTags("Auth")
@Controller("auth/passkeys")
export class PasskeyController {
  constructor(
    private readonly passkeys: PasskeyService,
    private readonly tokenService: TokenService,
  ) {}

  @Post("login/options")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Start a passwordless passkey sign-in" })
  @ApiResponse({ status: 200, type: PasskeyOptionsResponseDto })
  loginOptions(): Promise<
    CeremonyOptions<PublicKeyCredentialRequestOptionsJSON>
  > {
    return this.passkeys.authenticationOptions();
  }

  @Post("login/verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Finish a passkey sign-in; skips 2FA" })
  @ApiResponse({ status: 200, type: AccessTokenResponseDto })
  @ApiResponse({
    status: 400,
    description: "ChallengeExpired | PasskeyVerificationFailed",
  })
  @ApiResponse({ status: 404, description: "PasskeyNotFound" })
  async login(@Body() dto: PasskeyLoginDto): Promise<AccessTokenResponseDto> {
    const user = await this.passkeys.authenticate(
      dto.challengeId,
      dto.response,
    );
    return {
      access_token: this.tokenService.signAccessToken(user.id, user.email),
    };
  }

  @Post("register/options")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Start adding a passkey to the current account" })
  @ApiResponse({ status: 200, type: PasskeyOptionsResponseDto })
  registerOptions(
    @CurrentUser() user: AuthUser,
  ): Promise<CeremonyOptions<PublicKeyCredentialCreationOptionsJSON>> {
    return this.passkeys.registrationOptions(user.id);
  }

  @Post("register/verify")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Finish adding a passkey" })
  @ApiResponse({ status: 201, type: PasskeyDto })
  @ApiResponse({
    status: 400,
    description: "ChallengeExpired | PasskeyVerificationFailed",
  })
  register(
    @CurrentUser() user: AuthUser,
    @Body() dto: PasskeyRegisterDto,
  ): Promise<PasskeySummary> {
    return this.passkeys.register(
      user.id,
      dto.challengeId,
      dto.response,
      dto.name.trim(),
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the current account's passkeys" })
  @ApiResponse({ status: 200, type: PasskeyListResponseDto })
  list(@CurrentUser() user: AuthUser): Promise<PasskeyList> {
    return this.passkeys.list(user.id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Rename one of the current account's passkeys" })
  @ApiResponse({ status: 200, type: PasskeyDto })
  @ApiResponse({ status: 400, description: "PasskeyNameInvalid" })
  @ApiResponse({ status: 404, description: "PasskeyNotFound" })
  rename(
    @CurrentUser() user: AuthUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: PasskeyRenameDto,
  ): Promise<PasskeySummary> {
    return this.passkeys.rename(user.id, id, dto.name.trim());
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Remove one of the current account's passkeys" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: "PasskeyNotFound" })
  remove(
    @CurrentUser() user: AuthUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.passkeys.remove(user.id, id);
  }
}
