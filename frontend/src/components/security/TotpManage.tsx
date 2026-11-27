import { useState } from "react";
import { KeyRound, Loader2, RefreshCw, ShieldOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ErrorAlert";
import { OtpInput } from "@/components/OtpInput";
import { RecoveryCodeInput } from "@/components/RecoveryCodeInput";
import { getApiErrorCode } from "@/lib/apiError";
import {
  useMfaControllerDisableTotp,
  useMfaControllerRegenerateRecoveryCodes,
} from "../../api/endpoints/auth/auth";

interface TotpManageProps {
  recoveryCodesRemaining: number;
  onRecoveryCodes: (codes: string[]) => void;
  onDisabled: () => void;
}

/** 2FA is on: regenerate recovery codes or turn it off, both behind a code. */
export function TotpManage({
  recoveryCodesRemaining,
  onRecoveryCodes,
  onDisabled,
}: TotpManageProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [error, setError] = useState("");

  const toggleRecoveryCode = () => {
    setUseRecoveryCode((prev) => !prev);
    setCode("");
    setError("");
  };

  const regenerateMutation = useMfaControllerRegenerateRecoveryCodes();
  const disableMutation = useMfaControllerDisableTotp();
  const isPending = regenerateMutation.isPending || disableMutation.isPending;
  const codeReady = useRecoveryCode ? code.trim().length > 0 : code.length === 6;

  const run = async (action: () => Promise<void>) => {
    setError("");
    try {
      await action();
    } catch (err) {
      setError(getApiErrorCode(err));
    } finally {
      setCode("");
    }
  };

  const regenerate = () =>
    run(async () => {
      const { recoveryCodes } = await regenerateMutation.mutateAsync({
        data: { code: code.trim() },
      });
      onRecoveryCodes(recoveryCodes);
    });

  const disable = () =>
    run(async () => {
      await disableMutation.mutateAsync({ data: { code: code.trim() } });
      onDisabled();
    });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("security.recoveryCodesRemaining", { count: recoveryCodesRemaining })}
      </p>

      <div className="flex flex-col items-center gap-3 py-4">
        <label htmlFor="totp-manage" className="text-sm font-semibold">
          {useRecoveryCode ? t("twoFactor.recoveryCodeLabel") : t("twoFactor.codeLabel")}
        </label>
        {useRecoveryCode ? (
          <RecoveryCodeInput id="totp-manage" value={code} onChange={setCode} />
        ) : (
          <OtpInput id="totp-manage" value={code} onChange={setCode} />
        )}
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto gap-1.5 px-0"
          onClick={toggleRecoveryCode}
        >
          <KeyRound className="w-3.5 h-3.5" />
          {useRecoveryCode ? t("twoFactor.useAuthenticator") : t("twoFactor.useRecoveryCode")}
        </Button>
      </div>

      <ErrorAlert code={error} />

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="gap-2"
          onClick={regenerate}
          disabled={isPending || !codeReady}
        >
          {regenerateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {t("security.regenerateCodes")}
        </Button>
        <Button
          variant="destructive"
          className="gap-2 ml-auto"
          onClick={disable}
          disabled={isPending || !codeReady}
        >
          {disableMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ShieldOff className="w-4 h-4" />
          )}
          {t("security.disableTotp")}
        </Button>
      </div>
    </div>
  );
}
