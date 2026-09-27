import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/i18n-context";

export function LanguageToggle() {
  const { lang, toggleLang } = useLanguage();
  const { t } = useTranslation();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLang}
      aria-label={t("nav.switchLanguage")}
      className="gap-1.5 px-2 font-semibold uppercase"
    >
      <Languages className="w-4 h-4" />
      <span className="hidden text-xs sm:inline">
        {lang === "pl" ? "PL" : "EN"}
      </span>
    </Button>
  );
}
