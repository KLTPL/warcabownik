import { useEffect, useState } from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ErrorAlert";
import { AddPasskeyDialog } from "@/components/security/AddPasskeyDialog";
import { PasskeyListItem } from "@/components/security/PasskeyListItem";
import { usePasskeySupport } from "@/hooks/usePasskeySupport";
import { getApiErrorCode } from "@/lib/apiError";
import { syncAcceptedPasskeys } from "@/lib/passkey";
import {
  usePasskeyControllerList,
  usePasskeyControllerRemove,
  usePasskeyControllerRename,
} from "../../api/endpoints/auth/auth";

/** Security-page card: list, add, rename and remove passkeys. */
export function PasskeysCard() {
  const { t } = useTranslation();
  const support = usePasskeySupport();
  const { data, isLoading, refetch } = usePasskeyControllerList();
  const removeMutation = usePasskeyControllerRemove();
  const renameMutation = usePasskeyControllerRename();
  const [error, setError] = useState<string | null>(null);

  // On load and after every change, tell the password manager which passkeys
  // still exist, so it stops offering ones deleted here or elsewhere.
  useEffect(() => {
    if (data) void syncAcceptedPasskeys(data);
  }, [data]);

  const remove = async (id: string) => {
    setError(null);
    try {
      await removeMutation.mutateAsync({ id });
      await refetch();
    } catch (err) {
      setError(getApiErrorCode(err));
    }
  };

  const rename = async (id: string, name: string) => {
    await renameMutation.mutateAsync({ id, data: { name } });
    await refetch();
  };

  const renderList = () => {
    if (isLoading || !data) {
      return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
    }
    if (data.passkeys.length === 0) {
      return <p className="text-sm text-muted-foreground">{t("security.noPasskeys")}</p>;
    }
    return (
      <ul className="space-y-2">
        {data.passkeys.map((passkey) => (
          <PasskeyListItem
            key={passkey.id}
            passkey={passkey}
            isRemoving={removeMutation.isPending && removeMutation.variables?.id === passkey.id}
            onRemove={(id) => void remove(id)}
            onRename={rename}
          />
        ))}
      </ul>
    );
  };

  const renderAdd = () => {
    if (!support) return null;
    if (!support.available) {
      return <p className="text-sm text-muted-foreground">{t("security.passkeysUnsupported")}</p>;
    }
    return <AddPasskeyDialog onAdded={() => void refetch()} />;
  };

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="hidden sm:block shrink-0 p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">
              {t("security.passkeysTitle")}
            </CardTitle>
            <CardDescription>{t("security.passkeysDescription")}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {renderList()}
        {renderAdd()}
        <ErrorAlert code={error} />
      </CardContent>
    </Card>
  );
}
