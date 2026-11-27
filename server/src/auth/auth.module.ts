import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UserModule } from "src/user/user.module";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";
import { GithubStrategy } from "./strategies/github.strategy";
import { TokenService } from "./token.service";
import { MfaController } from "./mfa/mfa.controller";
import { MfaService } from "./mfa/mfa.service";
import { TotpService } from "./mfa/totp.service";
import { RecoveryCodesService } from "./mfa/recovery-codes.service";
import { SecretCipher } from "./mfa/secret-cipher";
@Module({
  imports: [UserModule, JwtModule, PassportModule],
  controllers: [AuthController, MfaController],
  providers: [
    AuthService,
    TokenService,
    JwtStrategy,
    GoogleStrategy,
    GithubStrategy,
    MfaService,
    TotpService,
    RecoveryCodesService,
    // Built at startup so a missing TOTP_ENCRYPTION_KEY fails fast.
    { provide: SecretCipher, useFactory: () => SecretCipher.fromEnv() },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
