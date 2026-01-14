import { useTranslation } from "react-i18next";

const LanguageToggle = () => {
  const { i18n, t } = useTranslation();
  const toggle = () => {
    i18n.changeLanguage(i18n.language === "en" ? "ru" : "en");
  };

  return (
    <button
      aria-label={t("toggle_language")}
      onClick={toggle}
      className="rounded-full border border-primary/20 px-4 py-1 text-sm font-semibold"
    >
      {i18n.language === "en" ? t("lang_ru") : t("lang_en")}
    </button>
  );
};

export default LanguageToggle;

