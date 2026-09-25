import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-github2";

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, "github") {
  constructor() {
    super({
      clientID: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/auth/github/callback",
      scope: ["user:email"],
    });
  }

  validate(accessToken: string, refreshToken: string, profile: any) {
    const { id, emails, username, displayName } = profile;
    const email = emails && emails[0] ? emails[0].value : null;

    return {
      githubId: id,
      email: email,
      username: username || displayName || `user_${id}`,
    };
  }
}