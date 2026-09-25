import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy } from "passport-google-oauth20";
import { OAuthUserDetails, OAuthVerifyCallback } from "../auth.types";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:3000/auth/google/callback",
      scope: ["email", "profile"],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: OAuthVerifyCallback,
  ): void {
    const { id, emails, displayName } = profile;
    const email = emails?.[0]?.value;
    if (!email) {
      // Passport turns a throw here into a failed authentication attempt.
      throw new Error("GoogleProfileMissingEmail");
    }

    const user: OAuthUserDetails = {
      googleId: id,
      email,
      username: displayName || email.split("@")[0],
    };
    done(null, user);
  }
}
