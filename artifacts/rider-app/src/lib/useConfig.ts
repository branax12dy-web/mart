import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";

export interface PlatformConfig {
  platform: {
    appName: string;
    supportPhone: string;
    appStatus: "active" | "maintenance";
    commissionPct: number;
    minOrderAmount: number;
  };
  features: {
    mart: boolean;
    food: boolean;
    rides: boolean;
    pharmacy: boolean;
    parcel: boolean;
    wallet: boolean;
    referral: boolean;
    newUsers: boolean;
    chat: boolean;
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
}

const DEFAULT_CONFIG: PlatformConfig = {
  platform: { appName: "AJKMart", supportPhone: "03001234567", appStatus: "active", commissionPct: 10, minOrderAmount: 100 },
  features: { mart: true, food: true, rides: true, pharmacy: true, parcel: true, wallet: true, referral: true, newUsers: true, chat: false, liveTracking: true, reviews: true },
  content: { banner: "", announcement: "", maintenanceMsg: "We're performing scheduled maintenance. Back soon!", supportMsg: "Need help? Chat with us!", tncUrl: "", privacyUrl: "" },
};

export function usePlatformConfig() {
  const { data, isLoading } = useQuery<PlatformConfig>({
    queryKey: ["platform-config"],
    queryFn: () => apiFetch("/platform-config"),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    retry: 2,
  });
  return { config: data ?? DEFAULT_CONFIG, isLoading };
}
