import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import * as Font from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadFonts = async () => {
      try {
        /* Attach .catch() to the font promise BEFORE the race so that
           if fontfaceobserver rejects AFTER the timeout resolves, the
           rejection is already handled and never becomes unhandled. */
        const fontPromise = Font.loadAsync({
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
        }).catch(() => { /* handled — fall back to system fonts */ });

        /* Race: whichever wins (font loaded or 4-second timeout), continue. */
        await Promise.race([
          fontPromise,
          new Promise<void>(resolve => setTimeout(resolve, 2000)),
        ]);
      } catch {
        /* Extra safety net for any other unexpected errors. */
      } finally {
        if (!cancelled) {
          setReady(true);
          SplashScreen.hideAsync();
        }
      }
    };

    loadFonts();
    return () => { cancelled = true; };
  }, []);

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
