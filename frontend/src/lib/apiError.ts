import { isAxiosError } from "axios";

/** Error shape NestJS' validation pipe and exception filters return. */
interface ApiErrorBody {
  message?: string | string[];
}

/**
 * Pulls the server's stable error code (e.g. "InvalidTotpCode") out of a
 * failed request, for `useErrorMessage` to translate.
 */
export function getApiErrorCode(err: unknown): string {
  if (isAxiosError<ApiErrorBody>(err)) {
    const message = err.response?.data?.message;
    return (Array.isArray(message) ? message[0] : message) || "authFailed";
  }
  if (err instanceof Error) {
    return err.message || "unexpected";
  }
  return "unexpected";
}
