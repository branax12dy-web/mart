import { useState, useCallback } from "react";
import type { Language } from "@workspace/i18n";
import { DEFAULT_LANGUAGE, LANGUAGE_OPTIONS, isRTL } from "@workspace/i18n";

const VALID_LANGS = new Set<string>(LANGUAGE_OPTIONS.map(o => o.value));
const STORAGE_KEY = "ajkmart_admin_language";

function applyRTL(lang: Language) {
  const dir = isRTL(lang) ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang === "ur" ? "ur" : "en");
}

function getSavedLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VALID_LANGS.has(saved)) return saved as Language;
  } catch {}
  return DEFAULT_LANGUAGE;
}

export function useLanguage() {
  const [language, setLang] = useState<Language>(() => {
    const lang = getSavedLanguage();
    applyRTL(lang);
    return lang;
  });
  const [loading, setLoading] = useState(false);
  const initialised = true;

  const setLanguage = useCallback(async (lang: Language) => {
    setLoading(true);
    setLang(lang);
    applyRTL(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    setLoading(false);
  }, []);

  return { language, setLanguage, loading, initialised };
}
