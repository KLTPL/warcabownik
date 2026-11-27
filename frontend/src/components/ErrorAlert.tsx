import { AlertCircle } from "lucide-react";
import { useErrorMessage } from "@/i18n/errorKeys";

/** Inline banner for a server error code; renders nothing without one. */
export function ErrorAlert({ code }: { code: string | null | undefined }) {
  const translateError = useErrorMessage();
  const message = translateError(code);
  if (!message) return null;

  return (
    <div
      role="alert"
      className="p-2.5 text-sm rounded-lg bg-destructive/10 text-destructive border border-destructive/20 flex items-start gap-2"
    >
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
