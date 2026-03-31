/**
 * RiderLocationContext — Background GPS tracking for riders in the ajkmart Expo app.
 *
 * • Uses expo-task-manager + expo-location startLocationUpdatesAsync for background tracking.
 * • Active only when the logged-in user has role === "rider".
 * • Starts when rider calls goOnline(), stops when they call goOffline().
 * • Applies a distance throttle (default 25 m) before sending to the server.
 * • Battery level included when available via expo-battery (optional).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Battery from "expo-battery";
import { AppState, AppStateStatus, Platform } from "react-native";
import { useAuth } from "./AuthContext";

const BACKGROUND_LOCATION_TASK = "RIDER_BACKGROUND_LOCATION";
const MIN_DISTANCE_METERS = 25;
const MAX_INTERVAL_SEC = 20;

/* ── Bug 5 fix: Use a Set of handlers instead of a single mutable global ── */
const backgroundLocationHandlers = new Set<(loc: Location.LocationObject) => void>();

/* ── Task registration (must be at module top level) ── */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: TaskManager.TaskManagerTaskBody<unknown>) => {
  if (error) return;
  const locations = (data as { locations?: Location.LocationObject[] })?.locations;
  if (!locations?.length) return;
  const loc = locations[locations.length - 1]!;
  backgroundLocationHandlers.forEach((handler) => {
    try { handler(loc); } catch {}
  });
});

/* ── Haversine distance ── */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type GoOnlineResult = "ok" | "permission_denied" | "tracking_failed";

interface RiderLocationContextType {
  isOnline: boolean;
  goOnline: () => Promise<GoOnlineResult>;
  goOffline: () => Promise<void>;
  toggleOnline: () => Promise<GoOnlineResult>;
  lastPosition: { lat: number; lng: number } | null;
  locationPermission: "granted" | "denied" | "undetermined";
}

const RiderLocationContext = createContext<RiderLocationContextType | null>(null);

export function RiderLocationProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const isRider = user?.role === "rider";

  const [isOnline, setIsOnline] = useState(false);
  const [lastPosition, setLastPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<"granted" | "denied" | "undetermined">("undetermined");

  const prevPositionRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  const isOnlineRef = useRef(false);
  isOnlineRef.current = isOnline;

  const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN ?? ""}/api`;

  const sendLocation = useCallback(async (loc: Location.LocationObject) => {
    const tok = tokenRef.current;
    if (!tok) return;

    const { latitude, longitude, accuracy, speed, heading } = loc.coords;
    const now = Date.now();

    /* Distance throttle */
    const prev = prevPositionRef.current;
    if (prev) {
      const dist = haversineMeters(prev.lat, prev.lng, latitude, longitude);
      const elapsed = (now - prev.ts) / 1000;
      if (dist < MIN_DISTANCE_METERS && elapsed < MAX_INTERVAL_SEC) return;
    }

    prevPositionRef.current = { lat: latitude, lng: longitude, ts: now };
    setLastPosition({ lat: latitude, lng: longitude });

    try {
      let batteryLevel: number | undefined;
      try {
        const level = await Battery.getBatteryLevelAsync();
        if (level >= 0) batteryLevel = Math.round(level * 100);
      } catch { /* battery unavailable on this platform */ }

      await fetch(`${API_BASE}/rider/location`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok}`,
        },
        body: JSON.stringify({
          latitude,
          longitude,
          accuracy: accuracy ?? undefined,
          speed: speed ?? undefined,
          heading: heading ?? undefined,
          batteryLevel,
        }),
      });
    } catch {}
  }, [API_BASE]);

  /* ── Bug 5 fix: Register/unregister handler in the Set (no race condition on remount) ── */
  useEffect(() => {
    backgroundLocationHandlers.add(sendLocation);
    return () => {
      backgroundLocationHandlers.delete(sendLocation);
    };
  }, [sendLocation]);

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== "granted") {
      setLocationPermission("denied");
      return false;
    }
    /* Background permission only needed on native */
    if (Platform.OS !== "web") {
      const { status: bg } = await Location.requestBackgroundPermissionsAsync();
      if (bg !== "granted") {
        setLocationPermission("denied");
        return false;
      }
    }
    setLocationPermission("granted");
    return true;
  }, []);

  /* ── Bug 1 fix: startTracking now throws on failure so goOnline can handle it ── */
  const startTracking = useCallback(async () => {
    if (Platform.OS === "web") return;
    const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (!running) {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: MIN_DISTANCE_METERS,
        timeInterval: MAX_INTERVAL_SEC * 1000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "AJKMart Rider",
          notificationBody: "You are online and tracking your location.",
          notificationColor: "#1A56DB",
        },
        pausesUpdatesAutomatically: false,
      });
    }
  }, []);

  const stopTracking = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (running) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch {}
  }, []);

  /* Also track foreground location on web using watchPosition */
  const watchIdRef = useRef<Location.LocationSubscription | null>(null);

  const startForegroundWatch = useCallback(async () => {
    if (watchIdRef.current) return;
    watchIdRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: MIN_DISTANCE_METERS,
        timeInterval: MAX_INTERVAL_SEC * 1000,
      },
      (loc) => sendLocation(loc),
    );
  }, [sendLocation]);

  const stopForegroundWatch = useCallback(() => {
    if (watchIdRef.current) {
      watchIdRef.current.remove();
      watchIdRef.current = null;
    }
  }, []);

  /* ── Bug 2 fix: AppState listener to start/stop foreground watch on native ── */
  useEffect(() => {
    if (Platform.OS === "web") return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (!isOnlineRef.current) return;
      if (nextState === "active") {
        startForegroundWatch().catch(() => {});
      } else {
        stopForegroundWatch();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [startForegroundWatch, stopForegroundWatch]);

  /* ── Bug 1 & 7 fix: goOnline now returns a status result ── */
  const goOnline = useCallback(async (): Promise<GoOnlineResult> => {
    if (!isRider) return "permission_denied";
    const ok = await checkPermissions();
    if (!ok) return "permission_denied";
    setIsOnline(true);
    prevPositionRef.current = null;
    if (Platform.OS === "web") {
      await startForegroundWatch();
    } else {
      try {
        await startTracking();
        /* Also start foreground watch immediately since app is in foreground now */
        await startForegroundWatch();
      } catch (err) {
        /* Bug 1 fix: startTracking failed — revert to offline and report error.
           Note: we do NOT set locationPermission to "denied" here since this is
           an operational GPS/system failure (not a permission denial — permissions
           were already confirmed above). We only revert isOnline. */
        setIsOnline(false);
        return "tracking_failed";
      }
    }
    return "ok";
  }, [isRider, checkPermissions, startTracking, startForegroundWatch]);

  const goOffline = useCallback(async () => {
    setIsOnline(false);
    prevPositionRef.current = null;
    stopForegroundWatch();
    if (Platform.OS !== "web") {
      await stopTracking();
    }
  }, [stopTracking, stopForegroundWatch]);

  const toggleOnline = useCallback(async (): Promise<GoOnlineResult> => {
    if (isOnline) {
      await goOffline();
      return "ok";
    } else {
      return goOnline();
    }
  }, [isOnline, goOnline, goOffline]);

  /* Stop tracking on logout */
  useEffect(() => {
    if (!isRider && isOnline) {
      goOffline().catch(() => {});
    }
  }, [isRider, isOnline, goOffline]);

  return (
    <RiderLocationContext.Provider
      value={{ isOnline, goOnline, goOffline, toggleOnline, lastPosition, locationPermission }}
    >
      {children}
    </RiderLocationContext.Provider>
  );
}

export function useRiderLocation() {
  const ctx = useContext(RiderLocationContext);
  if (!ctx) throw new Error("useRiderLocation must be used within RiderLocationProvider");
  return ctx;
}
