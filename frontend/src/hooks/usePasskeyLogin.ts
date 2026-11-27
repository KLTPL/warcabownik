import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { usePasskeySupport } from "@/hooks/usePasskeySupport";
import { getPasskeyErrorCode, signInWithPasskey } from "@/lib/passkey";

/**
 * Passwordless sign-in: a passkey replaces both the password and 2FA.
 *
 * While mounted it also offers passkeys in the sign-in form's autofill
 * (conditional mediation); the explicit button aborts that request first, as
 * only one WebAuthn request may be pending at a time.
 */
export function usePasskeyLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const support = usePasskeySupport();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autofillRef = useRef<AbortController | null>(null);

  const finish = (token: string) => {
    login(token);
    navigate("/");
  };
  // Read through a ref so the autofill request is not re-armed whenever the
  // auth context hands out a new `login` function.
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });

  const armAutofill = useCallback(() => {
    autofillRef.current?.abort();
    const controller = new AbortController();
    autofillRef.current = controller;
    signInWithPasskey({ mediation: "conditional", signal: controller.signal })
      .then((token) => finishRef.current(token))
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(getPasskeyErrorCode(err));
      });
  }, []);

  const canAutofill = support?.conditionalGet === true;

  useEffect(() => {
    if (!canAutofill) return;
    armAutofill();
    return () => autofillRef.current?.abort();
  }, [canAutofill, armAutofill]);

  const signIn = async () => {
    autofillRef.current?.abort();
    setError(null);
    setIsLoading(true);
    try {
      finish(await signInWithPasskey());
    } catch (err) {
      setError(getPasskeyErrorCode(err));
      if (canAutofill) armAutofill();
    } finally {
      setIsLoading(false);
    }
  };

  return { isSupported: support?.available === true, isLoading, error, signIn };
}
