import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PasskeyNameDialog } from "@/components/security/PasskeyNameDialog";
import { addPasskey, suggestPasskeyName } from "@/lib/passkey";

/** "Add passkey" button: name it in a dialog, then run the browser ceremony. */
export function AddPasskeyDialog({ onAdded }: { onAdded: () => void }) {
  const { t } = useTranslation();

  return (
    <PasskeyNameDialog
      trigger={(open) => (
        <Button className="gap-2" onClick={open}>
          <Plus className="w-4 h-4" />
          {t("security.addPasskey")}
        </Button>
      )}
      title={t("security.addPasskeyTitle")}
      description={t("security.addPasskeyDescription")}
      submitLabel={t("security.continue")}
      initialName={suggestPasskeyName}
      onSubmit={async (name) => {
        await addPasskey(name);
        onAdded();
      }}
    />
  );
}
