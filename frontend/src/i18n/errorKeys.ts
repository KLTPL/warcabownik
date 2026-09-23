import { useTranslation } from "react-i18next";

// Stable codes thrown by the server (see server/src/**: game.service.ts,
// auth.service.ts, user.service.ts, the auth guards and the auth DTOs),
// plus two client-only fallbacks.
const ERROR_CODES = [
  "InvalidCredentials",
  "EmailAlreadyUsed",
  "TokenExpired",
  "InvalidToken",
  "Unauthorized",
  "InvalidEmail",
  "WeakPassword",
  "UsernameTooShort",
  "UsernameTooLong",
  "InvalidMove",
  "GameNotFound",
  "GameAlreadyFinished",
  "NotYourTurn",
  "FailedToFetchAiMove",
  "authFailed",
  "unexpected",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export function isErrorCode(value: unknown): value is ErrorCode {
  return (
    typeof value === "string" &&
    (ERROR_CODES as readonly string[]).includes(value)
  );
}

/**
 * Translates a server error code. Anything unrecognised is passed through
 * verbatim, so a code the frontend doesn't know yet still shows the server's
 * own text rather than a blank box or a raw translation key.
 */
export function useErrorMessage() {
  const { t } = useTranslation();

  return (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    return isErrorCode(raw) ? t(`errors.${raw}`) : raw;
  };
}
