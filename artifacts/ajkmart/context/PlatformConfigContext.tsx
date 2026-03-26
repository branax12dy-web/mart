import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

const API = process.env.EXPO_PUBLIC_API_URL ?? "";
const CACHE_MS = 30_000;

export interface PlatformConfig {
  appStatus: "active" | "maintenance";
  features: {
    chat: boolean;
    wallet: boolean;
    liveTracking: boolean;
    reviews: boolean;
  };
  content: {
    banner: string;
    announcement: string;
    maintenanceMsg: string;
    supportMsg: string;
    tncUrl: string;
    privacyUrl: string;
  };
  platform: {
    supportPhone: string;
    name: string;
  };
}

const DEFAULT: PlatformConfig = {
  appStatus: "active",
  features: { chat: false, wallet: true, liveTracking: true, reviews: true },
  content: {
    banner: "",
    announcement: "",
    maintenanceMsg: "We're performing scheduled maintenance. Back soon!",
    supportMsg: "Need help? Chat with us!",
    tncUrl: "",
    privacyUrl: "",
  },
  platform: { supportPhone: "03001234567", name: "AJKMart" },
};

interface Ctx {
  config: PlatformConfig;
  loading: boolean;
  refresh: () => void;
}

const PlatformConfigContext = createContext<Ctx>({
  config: DEFAULT,
  loading: false,
  refresh: () => {},
});

let _cached: PlatformConfig | null = null;
let _cachedAt = 0;

export function PlatformConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PlatformConfig>(_cached ?? DEFAULT);
  const [loading, setLoading] = useState(!_cached);
  const fetchingRef = useRef(false);

  const fetchConfig = useCallback(async (force = false) => {
    if (fetchingRef.current) return;
    const now = Date.now();
    if (!force && _cached && now - _cachedAt < CACHE_MS) {
      setConfig(_cached);
      setLoading(false);
      return;
    }
    fetchingRef.current = true;
    try {
      const res = await fetch(`${API}/api/platform-config`, { cache: "no-store" });
      if (!res.ok) throw new Error("config fetch failed");
      const raw = await res.json();
      const parsed: PlatformConfig = {
        appStatus: raw.app?.status ?? "active",
        features: {
          chat:         (raw.features?.chat         ?? "off") === "on",
          wallet:       (raw.features?.wallet        ?? "on")  === "on",
          liveTracking: (raw.features?.liveTracking  ?? "on")  === "on",
          reviews:      (raw.features?.reviews       ?? "on")  === "on",
        },
        content: {
          banner:          raw.content?.banner          ?? "",
          announcement:    raw.content?.announcement    ?? "",
          maintenanceMsg:  raw.content?.maintenanceMsg  ?? DEFAULT.content.maintenanceMsg,
          supportMsg:      raw.content?.supportMsg      ?? DEFAULT.content.supportMsg,
          tncUrl:          raw.content?.tncUrl          ?? "",
          privacyUrl:      raw.content?.privacyUrl      ?? "",
        },
        platform: {
          supportPhone: raw.platform?.supportPhone ?? DEFAULT.platform.supportPhone,
          name:         raw.platform?.name         ?? DEFAULT.platform.name,
        },
      };
      _cached = parsed;
      _cachedAt = Date.now();
      setConfig(parsed);
    } catch {
      if (_cached) setConfig(_cached);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    const interval = setInterval(() => fetchConfig(), CACHE_MS);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") fetchConfig(true);
    });
    return () => { clearInterval(interval); sub.remove(); };
  }, [fetchConfig]);

  const refresh = useCallback(() => fetchConfig(true), [fetchConfig]);

  return (
    <PlatformConfigContext.Provider value={{ config, loading, refresh }}>
      {children}
    </PlatformConfigContext.Provider>
  );
}

export function usePlatformConfig() {
  return useContext(PlatformConfigContext);
}
