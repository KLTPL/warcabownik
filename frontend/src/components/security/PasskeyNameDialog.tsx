import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorAlert } from "@/components/ErrorAlert";
import { getPasskeyErrorCode } from "@/lib/passkey";

const NAME_MAX_LENGTH = 50;

interface PasskeyNameDialogProps {
  /** Renders the control that opens the dialog. */
  trigger: (open: () => void) => ReactNode;
  title: string;
  description: string;
  submitLabel: string;
  /** Name pre-filled each time the dialog opens. */
  initialName: () => string;
  /** Resolves to close the dialog; a rejection is shown inside it. */
  onSubmit: (name: string) => Promise<void>;
}

/** Native modal <dialog> that asks for a passkey name (add and rename). */
export function PasskeyNameDialog({
  trigger,
  title,
  description,
  submitLabel,
  initialName,
  onSubmit,
}: PasskeyNameDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const cancelFormId = useId();

  const open = () => {
    setName(initialName());
    setError(null);
    setIsOpen(true);
  };

  // showModal() after the pre-filled name has rendered, so it can be selected.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog || dialog.open) return;
    dialog.showModal();
    inputRef.current?.select();
  }, [isOpen]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      await onSubmit(name.trim());
      dialogRef.current?.close();
    } catch (err) {
      // Dismissing the browser prompt leaves the dialog open to try again.
      setError(getPasskeyErrorCode(err));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      {trigger(open)}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        closedby="any"
        onClose={() => setIsOpen(false)}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border-2 bg-card p-6 text-card-foreground shadow-lg overscroll-contain backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-black/50"
      >
        {/* Cancel submits this form: method="dialog" closes without JS. */}
        <form id={cancelFormId} method="dialog" />
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h1 id={titleId} className="text-lg font-bold tracking-tight">
                {title}
              </h1>
              <p id={descriptionId} className="text-sm text-muted-foreground">
                {description}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${titleId}-name`} className="block text-sm font-semibold">
              {t("security.passkeyNameLabel")}
            </label>
            <Input
              ref={inputRef}
              id={`${titleId}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("security.passkeyNamePlaceholder")}
              maxLength={NAME_MAX_LENGTH}
              required
            />
          </div>

          <ErrorAlert code={error} />

          <div className="flex justify-end gap-2">
            <Button type="submit" form={cancelFormId} variant="ghost" formNoValidate>
              {t("security.cancel")}
            </Button>
            <Button type="submit" className="gap-2" disabled={isPending || name.trim().length === 0}>
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
