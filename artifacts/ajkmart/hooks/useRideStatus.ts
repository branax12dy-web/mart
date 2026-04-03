import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getRide as getRideApi, type Ride } from "@workspace/api-client-react";

type RideStatusHookResult = {
  ride: Ride | null;
  setRide: React.Dispatch<React.SetStateAction<Ride | null>>;
  connectionType: "sse" | "polling" | "connecting";
  reconnect: () => void;
};

/** Base delay (ms) for the first SSE reconnection attempt. */
const SSE_RETRY_BASE_DELAY = 3000;
/**
 * Maximum SSE reconnection delay (ms). Caps exponential growth so we never
 * wait more than 10 s between reconnects before falling back to polling.
 */
const SSE_MAX_RETRY_DELAY = 10_000;
const POLL_INTERVAL = 5000;

export function useRideStatus(rideId: string): RideStatusHookResult {
  const [ride, setRide] = useState<Ride | null>(null);
  const [connectionType, setConnectionType] =
    useState<"sse" | "polling" | "connecting">("connecting");
  const abortRef = useRef<AbortController | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const sseFailCountRef = useRef(0);

  const apiBase = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setConnectionType("polling");

    const poll = async () => {
      try {
        const d = await getRideApi(rideId);
        if (mountedRef.current) {
          setRide(d);
          const status = d?.status;
          if (status === "completed" || status === "cancelled") {
            stopPolling();
          }
        }
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL);
  }, [rideId]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const closeSse = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const connectSse = useCallback(async () => {
    closeSse();
    clearRetryTimer();
    setConnectionType("connecting");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let token: string | null = null;
      try {
        const SS = await import("expo-secure-store");
        token = await SS.getItemAsync("ajkmart_token");
      } catch {}
      /* Never fall back to AsyncStorage — tokens must be read from SecureStore only. */
      const sseUrl = `${apiBase}/rides/${rideId}/stream`;

      const response = await fetch(sseUrl, {
        headers: {
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("SSE connection failed");
      }

      if (!mountedRef.current) return;
      sseFailCountRef.current = 0;
      stopPolling();
      setConnectionType("sse");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let streamDone = false;
      while (mountedRef.current) {
        const { done, value } = await reader.read();
        if (done) { streamDone = true; break; }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const data = JSON.parse(line.slice(5).trim()) as Ride;
            if (!mountedRef.current) return;
            setRide(data);
            if (data?.status === "completed" || data?.status === "cancelled") {
              /* Terminal state — close SSE cleanly and stop polling. */
              reader.releaseLock();
              abortRef.current?.abort();
              abortRef.current = null;
              stopPolling();
              return;
            }
          } catch {}
        }
      }

      if (streamDone && mountedRef.current) {
        /* Server closed the stream cleanly — reconnect immediately. */
        retryTimerRef.current = setTimeout(() => {
          if (mountedRef.current) connectSse();
        }, SSE_RETRY_BASE_DELAY);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      if (!mountedRef.current) return;

      sseFailCountRef.current += 1;

      if (sseFailCountRef.current >= 3) {
        /* Three consecutive failures — fall back to HTTP polling. */
        startPolling();
      } else {
        /* Exponential back-off capped at SSE_MAX_RETRY_DELAY. */
        const delay = Math.min(
          SSE_RETRY_BASE_DELAY * Math.pow(2, sseFailCountRef.current - 1),
          SSE_MAX_RETRY_DELAY,
        );
        retryTimerRef.current = setTimeout(() => {
          if (mountedRef.current) connectSse();
        }, delay);
      }
    }
  }, [rideId, apiBase, closeSse, clearRetryTimer, startPolling, stopPolling]);

  const reconnect = useCallback(() => {
    sseFailCountRef.current = 0;
    stopPolling();
    closeSse();
    connectSse();
  }, [connectSse, stopPolling, closeSse]);

  useEffect(() => {
    mountedRef.current = true;
    connectSse();

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active" && mountedRef.current) {
        reconnect();
      }
    });

    return () => {
      mountedRef.current = false;
      clearRetryTimer();
      closeSse();
      stopPolling();
      appStateSub.remove();
    };
  }, [rideId]);

  return { ride, setRide, connectionType, reconnect };
}
