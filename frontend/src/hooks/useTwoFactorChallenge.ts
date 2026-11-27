import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { getApiErrorCode } from "@/lib/apiError";
import { useMfaControllerVerify } from "../api/endpoints/auth/auth";

/** Router state a password login passes to the 2FA prompt. */
export interface TwoFactorLocationState {
  mfaToken: string;
}

function isTwoFactorState(value: unknown): value is TwoFactorLocationState {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).mfaToken === "string"
  );
}

/**
 * Second login step: trades the challenge token from the first step plus an
 * authenticator (or recovery) code for a session.
 */
export function useTwoFactorChallenge() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login } = useAuth();

  // Password logins pass the token in router state; OAuth redirects put it in
  // the query string. Read once, so clearing the URL below doesn't lose it.
  const [mfaToken] = useState<string | null>(() =>
    isTwoFactorState(location.state)
      ? location.state.mfaToken
      : searchParams.get("mfa_token")
  );

  // Keep the challenge token out of browser history.
  useEffect(() => {
    if (searchParams.has("mfa_token")) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [code, setCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [error, setError] = useState("");
  const verifyMutation = useMfaControllerVerify();

  /** Takes the code explicitly so auto-submit can pass the just-typed value. */
  const submitCode = async (value: string) => {
    if (!mfaToken || verifyMutation.isPending) return;
    setError("");

    try {
      const { access_token } = await verifyMutation.mutateAsync({
        data: { mfa_token: mfaToken, code: value.trim() },
      });
      login(access_token);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiErrorCode(err));
      setCode("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitCode(code);
  };

  const toggleRecoveryCode = () => {
    setUseRecoveryCode((prev) => !prev);
    setCode("");
    setError("");
  };

  return {
    mfaToken,
    code,
    setCode,
    useRecoveryCode,
    toggleRecoveryCode,
    error,
    /** The 5-minute challenge ran out; only a fresh sign-in helps. */
    challengeExpired: error === "MfaTokenInvalid",
    isLoading: verifyMutation.isPending,
    submitCode,
    handleSubmit,
  };
}
