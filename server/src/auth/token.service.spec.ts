import { JwtService } from "@nestjs/jwt";
import { ACCESS_TOKEN_AUDIENCE, TokenService } from "./token.service";

describe("TokenService", () => {
  const jwt = new JwtService();
  const service = new TokenService(jwt);
  const secret = "test-secret";

  beforeAll(() => {
    process.env.JWT_SECRET = secret;
    process.env.EXPIRY_TIME_MS = "3600000";
  });

  it("round-trips an MFA token to its user id", () => {
    expect(service.verifyMfaToken(service.signMfaToken("user-1"))).toBe(
      "user-1",
    );
  });

  it("does not accept an access token as an MFA token", () => {
    const access = service.signAccessToken("user-1", "a@b.c");
    expect(() => service.verifyMfaToken(access)).toThrow("MfaTokenInvalid");
  });

  it("does not accept an MFA token as an access token", () => {
    const mfa = service.signMfaToken("user-1");
    expect(() => {
      jwt.verify(mfa, { secret, audience: ACCESS_TOKEN_AUDIENCE });
    }).toThrow();
  });

  it("issues access tokens the access audience accepts", () => {
    const access = service.signAccessToken("user-1", "a@b.c");
    expect(
      jwt.verify<{ sub: string }>(access, {
        secret,
        audience: ACCESS_TOKEN_AUDIENCE,
      }).sub,
    ).toBe("user-1");
  });

  it("rejects garbage", () => {
    expect(() => service.verifyMfaToken("not-a-jwt")).toThrow(
      "MfaTokenInvalid",
    );
  });
});
