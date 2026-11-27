import { useState } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Fires once the last digit is entered (typed, pasted or autofilled). */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

/**
 * One box per digit, drawn over a single transparent `<input>`. Keeping one
 * real input means paste, SMS/password-manager `one-time-code` autofill and
 * the numeric mobile keyboard all work without per-box focus juggling.
 */
export function OtpInput({
  id,
  value,
  onChange,
  onComplete,
  length = 6,
  disabled,
  autoFocus,
  className,
}: OtpInputProps) {
  const [focused, setFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Pasted codes often carry spaces or dashes ("123 456").
    const digits = e.target.value.replace(/\D/g, "").slice(0, length);
    onChange(digits);
    if (digits.length === length && digits !== value) onComplete?.(digits);
  };

  const activeIndex = Math.min(value.length, length - 1);
  const half = Math.floor(length / 2);

  return (
    // Fluid: fills narrow screens, capped at the desktop size (6×52px boxes).
    <div
      className={cn(
        "relative w-full max-w-[24.5rem]",
        disabled && "opacity-50",
        className
      )}
    >
      <div className="flex items-center gap-1.5 sm:gap-3" aria-hidden="true">
        {Array.from({ length }, (_, i) => {
          const char = value[i];
          const isActive = focused && i === activeIndex;
          return (
            <div
              key={i}
              className={cn(
                "flex aspect-[4/5] min-w-0 flex-1 items-center justify-center rounded-lg border-2 bg-background font-mono text-xl font-semibold transition-all sm:rounded-xl sm:text-2xl dark:bg-input/30",
                isActive ? "border-ring ring-3 ring-ring/50" : "border-input",
                char && !isActive && "border-primary/40",
                // A wider gap splits the code into two easy-to-read halves.
                i === half && "ml-2 sm:ml-5"
              )}
            >
              {char ??
                (isActive && (
                  <span className="h-1/2 w-0.5 rounded-full bg-foreground animate-pulse" />
                ))}
            </div>
          );
        })}
      </div>
      <input
        id={id}
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        pattern="\d*"
        autoComplete="one-time-code"
        maxLength={length}
        disabled={disabled}
        autoFocus={autoFocus}
        required
        // text-base keeps iOS from zooming in on focus.
        className="absolute inset-0 h-full w-full cursor-text bg-transparent text-base text-transparent caret-transparent opacity-0 outline-none disabled:cursor-not-allowed"
      />
    </div>
  );
}
