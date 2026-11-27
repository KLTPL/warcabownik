import * as bcrypt from "bcrypt";
import { User } from "generated/prisma/client";
import { AuthService } from "./auth.service";
import { TokenService } from "./token.service";
import { UserService } from "src/user/user.service";
import { buildUser } from "./mfa/fake-mfa-prisma";

describe("AuthService first-factor login", () => {
  const PASSWORD = "Correct-Horse-1";
  let users: { findByEmail: jest.Mock; findByGoogleId: jest.Mock };
  let tokens: { signAccessToken: jest.Mock; signMfaToken: jest.Mock };
  let service: AuthService;

  const userWith = async (overrides: Partial<User>): Promise<User> =>
    buildUser({ passwordHash: await bcrypt.hash(PASSWORD, 4), ...overrides });

  beforeEach(() => {
    users = { findByEmail: jest.fn(), findByGoogleId: jest.fn() };
    tokens = {
      signAccessToken: jest.fn().mockReturnValue("access-jwt"),
      signMfaToken: jest.fn().mockReturnValue("mfa-jwt"),
    };
    service = new AuthService(
      users as unknown as UserService,
      tokens as unknown as TokenService,
    );
  });

  const login = () =>
    service.login({ email: "player@example.com", password: PASSWORD });

  it("returns an access token when 2FA is off", async () => {
    users.findByEmail.mockResolvedValue(await userWith({}));
    await expect(login()).resolves.toEqual({
      mfa_required: false,
      access_token: "access-jwt",
    });
    expect(tokens.signMfaToken).not.toHaveBeenCalled();
  });

  it("returns only an MFA challenge when 2FA is on", async () => {
    users.findByEmail.mockResolvedValue(await userWith({ totpEnabled: true }));
    await expect(login()).resolves.toEqual({
      mfa_required: true,
      mfa_token: "mfa-jwt",
    });
    expect(tokens.signAccessToken).not.toHaveBeenCalled();
  });

  it("rejects a wrong password before any 2FA step", async () => {
    users.findByEmail.mockResolvedValue(await userWith({ totpEnabled: true }));
    await expect(
      service.login({ email: "player@example.com", password: "nope" }),
    ).rejects.toThrow("InvalidCredentials");
    expect(tokens.signMfaToken).not.toHaveBeenCalled();
  });

  it("requires 2FA on OAuth logins too", async () => {
    users.findByGoogleId.mockResolvedValue(
      await userWith({ googleId: "g-1", totpEnabled: true }),
    );
    await expect(
      service.validateOAuthUser({
        googleId: "g-1",
        email: "player@example.com",
        username: "player",
      }),
    ).resolves.toEqual({ mfa_required: true, mfa_token: "mfa-jwt" });
  });
});
