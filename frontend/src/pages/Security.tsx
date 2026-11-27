import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2, ShieldCheck, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { RecoveryCodesPanel } from "@/components/security/RecoveryCodesPanel";
import { TotpManage } from "@/components/security/TotpManage";
import { TotpSetupFlow } from "@/components/security/TotpSetupFlow";
import { PasskeysCard } from "@/components/security/PasskeysCard";
import { useMfaControllerGetSecurityStatus } from "../api/endpoints/auth/auth";

export function Security() {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/auth" replace />;
  return <SecuritySettings />;
}

function SecuritySettings() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: status, isLoading, refetch } = useMfaControllerGetSecurityStatus();
  // Codes just issued by enable/regenerate; shown until the user confirms.
  const [newCodes, setNewCodes] = useState<string[] | null>(null);

  const finishShowingCodes = () => {
    setNewCodes(null);
    void refetch();
  };

  const renderTotpBody = () => {
    if (isLoading || !status) {
      return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
    }
    if (newCodes) {
      return <RecoveryCodesPanel codes={newCodes} onDone={finishShowingCodes} />;
    }
    if (status.totpEnabled) {
      return (
        <TotpManage
          recoveryCodesRemaining={status.recoveryCodesRemaining}
          onRecoveryCodes={setNewCodes}
          onDisabled={() => void refetch()}
        />
      );
    }
    return <TotpSetupFlow onEnabled={setNewCodes} />;
  };

  return (
    <div className="max-w-3xl mx-auto mt-4 sm:mt-8 space-y-6 sm:px-4">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground hover:text-foreground"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="w-4 h-4" /> {t("common.backToDashboard")}
      </Button>

      <Card className="border-2 shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="hidden sm:block shrink-0 p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              {/* Badge pinned right: the title wraps, the badge never does. */}
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="min-w-0 text-xl sm:text-2xl font-bold tracking-tight">
                  {t("security.totpTitle")}
                </CardTitle>
                {status && (
                  <Badge
                    variant={status.totpEnabled ? "default" : "outline"}
                    className="mt-1 sm:mt-1.5"
                  >
                    {status.totpEnabled ? (
                      <Check data-icon="inline-start" />
                    ) : (
                      <X data-icon="inline-start" />
                    )}
                    {status.totpEnabled ? t("security.on") : t("security.off")}
                  </Badge>
                )}
              </div>
              <CardDescription>{t("security.totpDescription")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>{renderTotpBody()}</CardContent>
      </Card>

      <PasskeysCard />
    </div>
  );
}
