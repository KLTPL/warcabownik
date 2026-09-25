import { createContext, useContext } from "react";
import type { Language } from "@/i18n";

export interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
}

export const I18nContext = createContext<I18nContextValue | undefined>(
  undefined
);

export function useLanguage() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useLanguage must be used within an I18nProvider");
  }
  return context;
}
