import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/* Suppress fontfaceobserver timeout errors on web — these are non-fatal
   and only occur because the sandboxed iframe blocks scroll-based detection. */
if (Platform.OS === "web" && typeof window !== "undefined") {
  const _origOnError = window.onerror;
  window.onerror = (msg, src, line, col, err) => {
    if (typeof msg === "string" && msg.includes("timeout exceeded")) return true;
    if (_origOnError) return _origOnError(msg, src, line, col, err);
    return false;
  };
  const _origUnhandled = window.onunhandledrejection;
  window.addEventListener("unhandledrejection", (e) => {
    if (e?.reason?.message?.includes("timeout exceeded")) {
      e.preventDefault();
    }
  });
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index"          options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)"         options={{ headerShown: false }} />
      <Stack.Screen name="auth/index"     options={{ headerShown: false }} />
      <Stack.Screen name="mart/index"     options={{ headerShown: false }} />
      <Stack.Screen name="food/index"     options={{ headerShown: false }} />
      <Stack.Screen name="ride/index"     options={{ headerShown: false }} />
      <Stack.Screen name="cart/index"     options={{ headerShown: false }} />
      <Stack.Screen name="pharmacy/index" options={{ headerShown: false }} />
      <Stack.Screen name="parcel/index"   options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  /* Fallback: if fonts haven't resolved after 4 s, show the app anyway.
     This prevents a blank screen when fontfaceobserver times out on web. */
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const ready = fontsLoaded || !!fontError || timedOut;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <CartProvider>
                  <RootLayoutNav />
                </CartProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
