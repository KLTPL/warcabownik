import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-google-oauth20";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/auth/google/callback",
      scope: ["email", "profile"],
    });
  }

  validate(accessToken: string, refreshToken: string, profile: any) {
    const { id, emails, displayName } = profile;
    return {
      googleId: id,
      email: emails[0].value,
      username: displayName || emails[0].value.split("@")[0],
    };
  }
}