import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import i18n, {
  getInitialLanguage,
  LANGUAGE_STORAGE_KEY,
  type Language,
} from "@/i18n";
import { I18nContext } from "./i18n-context";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(getInitialLanguage);
  const { t } = useTranslation();

  useEffect(() => {
    void i18n.changeLanguage(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  // The <title> in index.html is static; keep it in sync with the active
  // language once React takes over.
  useEffect(() => {
    document.title = t("meta.title");
  }, [t, lang]);

  const toggleLang = () => {
    setLang((prev) => (prev === "pl" ? "en" : "pl"));
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
}
