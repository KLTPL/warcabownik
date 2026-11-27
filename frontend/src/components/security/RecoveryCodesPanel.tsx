import { useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface RecoveryCodesPanelProps {
  codes: string[];
  onDone: () => void;
}

/** Shows freshly issued recovery codes; the server never returns them again. */
export function RecoveryCodesPanel({ codes, onDone }: RecoveryCodesPanelProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    await navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
  };

  return (
    <div className="space-y-4">
      <div className="p-3 text-sm rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-start gap-2">
        <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{t("security.recoveryCodesWarning")}</span>
      </div>

      <ul className="grid grid-cols-2 gap-2 p-4 rounded-lg bg-muted font-mono text-sm text-center">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="gap-2" onClick={copyAll}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? t("security.copied") : t("security.copyCodes")}
        </Button>
        <Button type="button" onClick={onDone}>
          {t("security.savedCodes")}
        </Button>
      </div>
    </div>
  );
}
