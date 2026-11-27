import { Fingerprint, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ErrorAlert";
import { usePasskeyLogin } from "@/hooks/usePasskeyLogin";

/** "Sign in with a passkey"; renders nothing where WebAuthn is unavailable. */
export function PasskeySignInButton() {
  const { t } = useTranslation();
  const { isSupported, isLoading, error, signIn } = usePasskeyLogin();
  if (!isSupported) return null;

  return (
    <div className="mt-3 space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 border-border/60 hover:bg-accent/80 transition-all"
        onClick={() => void signIn()}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Fingerprint className="w-4 h-4" />
        )}
        {t("auth.signInWithPasskey")}
      </Button>
      <ErrorAlert code={error} />
    </div>
  );
}
