import { useEffect, useState } from "react";
import { getPasskeySupport, type PasskeySupport } from "@/lib/passkey";

/** Passkey capabilities of this browser; null until detected. */
export function usePasskeySupport(): PasskeySupport | null {
  const [support, setSupport] = useState<PasskeySupport | null>(null);

  useEffect(() => {
    let active = true;
    void getPasskeySupport().then((result) => {
      if (active) setSupport(result);
    });
    return () => {
      active = false;
    };
  }, []);

  return support;
}
