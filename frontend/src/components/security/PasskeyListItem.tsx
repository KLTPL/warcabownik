import { useState } from "react";
import { Cloud, KeyRound, Loader2, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PasskeyNameDialog } from "@/components/security/PasskeyNameDialog";
import type { PasskeyDto } from "../../api/models";

interface PasskeyListItemProps {
  passkey: PasskeyDto;
  isRemoving: boolean;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => Promise<void>;
}

/** One saved passkey: rename it, or remove it after a confirming click. */
export function PasskeyListItem({
  passkey,
  isRemoving,
  onRemove,
  onRename,
}: PasskeyListItemProps) {
  const { t, i18n } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { dateStyle: "medium" });

  return (
    <li className="flex items-center gap-3 rounded-lg border p-3">
      <KeyRound className="hidden sm:block w-5 h-5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{passkey.name}</span>
          {passkey.backedUp && (
            <Badge variant="outline">
              <Cloud data-icon="inline-start" />
              {t("security.passkeySynced")}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("security.passkeyAdded", { date: formatDate(passkey.createdAt) })}
          {" · "}
          {passkey.lastUsedAt
            ? t("security.passkeyLastUsed", { date: formatDate(passkey.lastUsedAt) })
            : t("security.passkeyNeverUsed")}
        </p>
      </div>

      {confirming ? (
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            {t("security.cancel")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => onRemove(passkey.id)}
            disabled={isRemoving}
          >
            {isRemoving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t("security.removePasskey")}
          </Button>
        </div>
      ) : (
        <div className="flex shrink-0">
          <PasskeyNameDialog
            trigger={(open) => (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                aria-label={t("security.renamePasskeyNamed", { name: passkey.name })}
                onClick={open}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            title={t("security.renamePasskeyTitle")}
            description={t("security.renamePasskeyDescription")}
            submitLabel={t("security.save")}
            initialName={() => passkey.name}
            onSubmit={(name) => onRename(passkey.id, name)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            aria-label={t("security.removePasskeyNamed", { name: passkey.name })}
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </li>
  );
}
