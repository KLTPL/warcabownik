import { useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ErrorAlert";
import { OtpInput } from "@/components/OtpInput";
import { getApiErrorCode } from "@/lib/apiError";
import {
  useMfaControllerEnableTotp,
  useMfaControllerSetupTotp,
} from "../../api/endpoints/auth/auth";
import type { TotpSetupResponseDto } from "../../api/models";

interface TotpSetupFlowProps {
  /** Called with the first recovery codes once 2FA is on. */
  onEnabled: (recoveryCodes: string[]) => void;
}

/** Scan QR → confirm a code → 2FA on. */
export function TotpSetupFlow({ onEnabled }: TotpSetupFlowProps) {
  const { t } = useTranslation();
  const [setup, setSetup] = useState<TotpSetupResponseDto | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const setupMutation = useMfaControllerSetupTotp();
  const enableMutation = useMfaControllerEnableTotp();

  const startSetup = async () => {
    setError("");
    try {
      setSetup(await setupMutation.mutateAsync());
    } catch (err) {
      setError(getApiErrorCode(err));
    }
  };

  const confirm = async (value: string) => {
    if (enableMutation.isPending) return;
    setError("");
    try {
      const { recoveryCodes } = await enableMutation.mutateAsync({
        data: { code: value },
      });
      onEnabled(recoveryCodes);
    } catch (err) {
      setError(getApiErrorCode(err));
      setCode("");
    }
  };

  if (!setup) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("security.totpOffBody")}</p>
        <ErrorAlert code={error} />
        <Button className="gap-2" onClick={startSetup} disabled={setupMutation.isPending}>
          {setupMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Smartphone className="w-4 h-4" />
          )}
          {t("security.setUpTotp")}
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void confirm(code);
      }}
      className="space-y-4"
    >
      <p className="text-sm text-muted-foreground">{t("security.scanQr")}</p>
      <img
        src={setup.qrCodeDataUrl}
        alt={t("security.qrAlt")}
        className="w-44 h-44 rounded-lg border bg-white p-2"
      />
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{t("security.manualEntry")}</p>
        <code className="block break-all rounded-md bg-muted px-2 py-1 font-mono text-sm select-all">
          {setup.secret}
        </code>
      </div>

      <div className="flex flex-col items-center gap-3 py-4">
        <label htmlFor="totp-confirm" className="text-sm font-semibold">
          {t("security.enterCodeToConfirm")}
        </label>
        <OtpInput
          id="totp-confirm"
          value={code}
          onChange={setCode}
          onComplete={(value) => void confirm(value)}
        />
      </div>

      <ErrorAlert code={error} />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="gap-2" disabled={enableMutation.isPending}>
          {enableMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {t("security.enableTotp")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setSetup(null)}>
          {t("security.cancel")}
        </Button>
      </div>
    </form>
  );
}
