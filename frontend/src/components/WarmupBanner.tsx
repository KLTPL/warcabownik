import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { WarmupPhase } from "@/hooks/useServiceWarmup";

export function WarmupBanner({ phase }: { phase: WarmupPhase }) {
  const { t } = useTranslation();

  if (phase === "waking") {
    return (
      <div
        role="status"
        className="border-b bg-muted/60 text-muted-foreground text-sm"
      >
        <div className="container mx-auto flex items-center gap-2 px-4 py-2">
          <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
          <span>{t("warmup.waking")}</span>
        </div>
      </div>
    );
  }

  if (phase === "unreachable") {
    return (
      <div
        role="alert"
        className="border-b bg-destructive/10 text-destructive text-sm"
      >
        <div className="container mx-auto flex items-center gap-2 px-4 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{t("warmup.unreachable")}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            {t("common.refresh")}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
