import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useCallback } from "react";
import { I18nManager } from "react-native";
import type { Language } from "@workspace/i18n";

const LANG_STORAGE_KEY = "@ajkmart_language";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  loading: boolean;
  syncToServer: (token: string) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en_roman",
  setLanguage: async () => {},
  loading: false,
  syncToServer: async () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (I18nManager.isRTL) {
      I18nManager.forceRTL(false);
    }
    AsyncStorage.removeItem(LANG_STORAGE_KEY).catch(() => {});
  }, []);

  const setLanguage = useCallback(async (_lang: Language) => {}, []);

  const syncToServer = useCallback(async (_token: string) => {}, []);

  return (
    <LanguageContext.Provider value={{ language: "en_roman", setLanguage, loading: false, syncToServer }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
