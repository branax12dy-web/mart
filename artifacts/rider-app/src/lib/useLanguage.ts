import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import React from "react";
import type { Language } from "@workspace/i18n";

const STORAGE_KEY = "ajkmart_rider_language";

function getStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "ur" || stored === "en") return stored;
  } catch {}
  return "en";
}

interface LanguageCtx {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  loading: boolean;
  initialised: boolean;
}

const LanguageContext = createContext<LanguageCtx>({
  language: "en",
  setLanguage: async () => {},
  loading: false,
  initialised: true,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {}
  }, [language]);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
  }, []);

  return React.createElement(
    LanguageContext.Provider,
    { value: { language, setLanguage, loading: false, initialised: true } },
    children
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
