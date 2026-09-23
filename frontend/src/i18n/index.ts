import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import pl from "./locales/pl.json";

export const SUPPORTED_LANGUAGES = ["en", "pl"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = "lang";

function isSupported(value: string | null): value is Language {
  return (
    value !== null && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}

// Mirrors getInitialTheme() in context/ThemeContext.tsx: an explicit choice
// wins, otherwise fall back to the browser's preference.
export function getInitialLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isSupported(stored)) {
    return stored;
  }
  return navigator.language.toLowerCase().startsWith("pl") ? "pl" : "en";
}

const initialLanguage = getInitialLanguage();

// Applied before React mounts so the document never declares the wrong
// language on first paint; I18nContext keeps it in sync after that.
document.documentElement.lang = initialLanguage;

void i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pl: { translation: pl },
  },
  lng: initialLanguage,
  fallbackLng: "en",
  // React already escapes interpolated values.
  interpolation: { escapeValue: false },
});

export default i18next;
