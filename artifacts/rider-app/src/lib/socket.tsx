import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { api } from "./api";
import { useAuth } from "./auth";

type SocketContextType = {
  socket: Socket | null;
  connected: boolean;
  setRiderPosition: (lat: number, lng: number) => void;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  setRiderPosition: () => {},
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  /* Cached position fed by Home.tsx / Active.tsx watchPosition — no separate GPS listener here */
  const lastLatRef = useRef<number | undefined>(undefined);
  const lastLngRef = useRef<number | undefined>(undefined);

  /* Called from watchPosition callbacks in Home.tsx and Active.tsx */
  const setRiderPosition = useCallback((lat: number, lng: number) => {
    lastLatRef.current = lat;
    lastLngRef.current = lng;
  }, []);

  useEffect(() => {
    const token = api.getToken();
    if (!token || !user?.id) return;

    const socketOrigin = import.meta.env.VITE_CAPACITOR === "true" && import.meta.env.VITE_API_BASE_URL
      ? (import.meta.env.VITE_API_BASE_URL as string).replace(/\/+$/, "")
      : window.location.origin;

    const s = io(socketOrigin, {
      path: "/api/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: 20,
    });
    socketRef.current = s;
    setSocket(s);

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("connect_error", () => setConnected(false));

    const tokenRefreshInterval = setInterval(() => {
      const freshToken = api.getToken();
      if (freshToken && freshToken !== (s.auth as { token?: string })?.token) {
        (s.auth as { token?: string }).token = freshToken;
      }
    }, 10_000);

    return () => {
      clearInterval(tokenRefreshInterval);
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, [user?.id]);

  useEffect(() => {
    const s = socketRef.current;
    if (!s || !user?.isOnline) return;

    let batteryLevel: number | undefined;
    type BatteryManager = { level: number; addEventListener: (event: string, cb: () => void) => void };
    (navigator as unknown as { getBattery?: () => Promise<BatteryManager> }).getBattery?.()
      .then((batt) => {
        batteryLevel = batt.level;
        batt.addEventListener("levelchange", () => { batteryLevel = batt.level; });
      }).catch(() => {});

    const emitHeartbeat = () => {
      if (!s.connected) return;
      s.emit("rider:heartbeat", {
        batteryLevel,
        isOnline: true,
        timestamp: new Date().toISOString(),
        /* Use position cached from the page-level watchPosition — no duplicate GPS listener */
        ...(lastLatRef.current !== undefined && lastLngRef.current !== undefined
          ? { latitude: lastLatRef.current, longitude: lastLngRef.current }
          : {}),
      });
    };

    s.on("connect", emitHeartbeat);
    emitHeartbeat();
    const heartbeatInterval = setInterval(emitHeartbeat, 30_000);

    return () => {
      clearInterval(heartbeatInterval);
      s.off("connect", emitHeartbeat);
    };
  }, [user?.isOnline, socket]);

  return (
    <SocketContext.Provider value={{ socket, connected, setRiderPosition }}>
      {children}
    </SocketContext.Provider>
  );
}
