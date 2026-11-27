import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface RecoveryCodeInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

/** Field for an `XXXXX-XXXXX` recovery code (the fallback to OtpInput). */
export function RecoveryCodeInput({
  id,
  value,
  onChange,
  disabled,
  autoFocus,
  className,
}: RecoveryCodeInputProps) {
  return (
    <Input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="XXXXX-XXXXX"
      autoComplete="off"
      autoCapitalize="characters"
      spellCheck={false}
      maxLength={11}
      className={cn(
        "h-14 max-w-xs text-center font-mono text-xl tracking-widest uppercase",
        className
      )}
      disabled={disabled}
      autoFocus={autoFocus}
      required
    />
  );
}
