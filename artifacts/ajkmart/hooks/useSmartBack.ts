import { useCallback } from "react";
import { router } from "expo-router";
import { useNavigation } from "@react-navigation/native";

export function useSmartBack(fallback: string = "/(tabs)") {
  const navigation = useNavigation();

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback as any);
    }
  }, [navigation, fallback]);

  const goHome = useCallback(() => {
    router.replace("/(tabs)" as any);
  }, []);

  return { goBack, goHome, canGoBack: navigation.canGoBack() };
}
