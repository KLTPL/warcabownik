import { Navigate, Link } from "react-router-dom";
import { ShieldCheck, Loader2, KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ErrorAlert";
import { OtpInput } from "@/components/OtpInput";
import { RecoveryCodeInput } from "@/components/RecoveryCodeInput";
import { useTwoFactorChallenge } from "@/hooks/useTwoFactorChallenge";

export function TwoFactor() {
  const {
    mfaToken,
    code,
    setCode,
    useRecoveryCode,
    toggleRecoveryCode,
    error,
    challengeExpired,
    isLoading,
    submitCode,
    handleSubmit,
  } = useTwoFactorChallenge();

  const { t } = useTranslation();

  if (!mfaToken) return <Navigate to="/auth" replace />;

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full py-8 px-4">
      <Card className="w-full max-w-md border-2 shadow-lg">
        <CardHeader className="space-y-1 text-center pt-5 pb-3">
          <div className="mx-auto mb-2 p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <CardTitle className="text-xl">{t("twoFactor.title")}</CardTitle>
          <CardDescription>
            {useRecoveryCode
              ? t("twoFactor.descriptionRecovery")
              : t("twoFactor.descriptionTotp")}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0 pb-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-col items-center gap-2 py-4">
              <label htmlFor="code" className="sr-only">
                {useRecoveryCode ? t("twoFactor.recoveryCodeLabel") : t("twoFactor.codeLabel")}
              </label>
              {useRecoveryCode ? (
                <RecoveryCodeInput
                  id="code"
                  value={code}
                  onChange={setCode}
                  disabled={challengeExpired}
                  autoFocus
                />
              ) : (
                <OtpInput
                  id="code"
                  value={code}
                  onChange={setCode}
                  onComplete={(value) => void submitCode(value)}
                  disabled={challengeExpired}
                  autoFocus
                />
              )}
            </div>

            <ErrorAlert code={error} />

            {challengeExpired ? (
              <Link to="/auth" className="block">
                <Button type="button" className="w-full">
                  {t("twoFactor.backToSignIn")}
                </Button>
              </Link>
            ) : (
              <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("auth.processing")}
                  </>
                ) : (
                  t("twoFactor.verify")
                )}
              </Button>
            )}
          </form>

          {!challengeExpired && (
            <Button
              type="button"
              variant="link"
              className="w-full mt-2 gap-2"
              onClick={toggleRecoveryCode}
            >
              <KeyRound className="w-4 h-4" />
              {useRecoveryCode
                ? t("twoFactor.useAuthenticator")
                : t("twoFactor.useRecoveryCode")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
