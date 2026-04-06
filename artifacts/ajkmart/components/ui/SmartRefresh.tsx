import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from "react-native";
import Colors, { spacing } from "@/constants/colors";
import Svg, { Circle } from "react-native-svg";

const C = Colors.light;

interface SmartRefreshProps extends ScrollViewProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  lastUpdated?: Date | null;
  accentColor?: string;
}

const PULL_THRESHOLD = 80;
const INDICATOR_SIZE = 40;
const ARC_RADIUS = 14;
const ARC_STROKE = 2.5;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;

type RefreshPhase = "idle" | "pulling" | "ready" | "refreshing" | "success";

function formatLastUpdated(date: Date | null | undefined): string {
  if (!date) return "";
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "Just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function CircularArcIndicator({
  progress,
  phase,
  color,
}: {
  progress: number;
  phase: RefreshPhase;
  color: string;
}) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (phase === "refreshing") {
      spinAnim.setValue(0);
      spinRef.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== "web",
        })
      );
      spinRef.current.start();
    } else {
      spinRef.current?.stop();
    }
    return () => { spinRef.current?.stop(); };
  }, [phase]);

  const spinRotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const dashOffset = ARC_CIRCUMFERENCE * (1 - Math.min(progress, 1));
  const isReady = phase === "ready";
  const arcColor = isReady ? C.success : color;

  if (phase === "refreshing") {
    return (
      <Animated.View style={{ transform: [{ rotate: spinRotate }] }}>
        <Svg width={INDICATOR_SIZE} height={INDICATOR_SIZE} viewBox={`0 0 ${INDICATOR_SIZE} ${INDICATOR_SIZE}`}>
          <Circle
            cx={INDICATOR_SIZE / 2}
            cy={INDICATOR_SIZE / 2}
            r={ARC_RADIUS}
            stroke={color + "20"}
            strokeWidth={ARC_STROKE}
            fill="none"
          />
          <Circle
            cx={INDICATOR_SIZE / 2}
            cy={INDICATOR_SIZE / 2}
            r={ARC_RADIUS}
            stroke={color}
            strokeWidth={ARC_STROKE}
            fill="none"
            strokeDasharray={`${ARC_CIRCUMFERENCE * 0.7} ${ARC_CIRCUMFERENCE * 0.3}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${INDICATOR_SIZE / 2} ${INDICATOR_SIZE / 2})`}
          />
        </Svg>
      </Animated.View>
    );
  }

  return (
    <View>
      <Svg width={INDICATOR_SIZE} height={INDICATOR_SIZE} viewBox={`0 0 ${INDICATOR_SIZE} ${INDICATOR_SIZE}`}>
        <Circle
          cx={INDICATOR_SIZE / 2}
          cy={INDICATOR_SIZE / 2}
          r={ARC_RADIUS}
          stroke={arcColor + "20"}
          strokeWidth={ARC_STROKE}
          fill="none"
        />
        <Circle
          cx={INDICATOR_SIZE / 2}
          cy={INDICATOR_SIZE / 2}
          r={ARC_RADIUS}
          stroke={arcColor}
          strokeWidth={ARC_STROKE}
          fill="none"
          strokeDasharray={`${ARC_CIRCUMFERENCE}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${INDICATOR_SIZE / 2} ${INDICATOR_SIZE / 2})`}
        />
      </Svg>
      <View style={pi.iconOverlay}>
        {isReady ? (
          <Text style={[pi.iconText, { color: C.success }]}>↑</Text>
        ) : (
          <Text style={[pi.iconText, { color }]}>↓</Text>
        )}
      </View>
    </View>
  );
}

function PullLabel({ phase }: { phase: RefreshPhase }) {
  if (phase === "idle" || phase === "refreshing" || phase === "success") return null;

  const text = phase === "ready" ? "Release to refresh" : "Pull to refresh";
  const color = phase === "ready" ? C.success : C.textMuted;

  return (
    <Text style={[pi.labelText, { color }]}>{text}</Text>
  );
}

function StatusBanner({
  phase,
  timeStr,
  accentColor,
  bannerAnim,
  bannerContent,
}: {
  phase: RefreshPhase;
  timeStr: string;
  accentColor: string;
  bannerAnim: Animated.Value;
  bannerContent: RefreshPhase | "stale";
}) {
  const translateY = bannerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-36, 0],
  });

  const opacity = bannerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.8, 1],
  });

  let content;
  if (bannerContent === "refreshing") {
    content = (
      <View style={banner.statusRow}>
        <BannerSpinner size={12} color={accentColor} />
        <Text style={[banner.statusText, { color: accentColor }]}>Refreshing...</Text>
      </View>
    );
  } else if (bannerContent === "success") {
    content = (
      <View style={banner.statusRow}>
        <Text style={[banner.successIcon, { color: C.success }]}>✓</Text>
        <Text style={[banner.statusText, { color: C.success }]}>Updated</Text>
      </View>
    );
  } else if (bannerContent === "stale" && timeStr) {
    content = (
      <Text style={banner.timeText}>Updated {timeStr}</Text>
    );
  }

  return (
    <Animated.View style={[banner.wrap, { transform: [{ translateY }], opacity }]}>
      <View style={banner.inner}>{content}</View>
    </Animated.View>
  );
}

function BannerSpinner({ size = 12, color = C.primary }: { size?: number; color?: string }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color + "30",
        borderTopColor: color,
      }} />
    </Animated.View>
  );
}

export function SmartRefresh({
  onRefresh,
  children,
  lastUpdated,
  accentColor = C.primary,
  ...scrollProps
}: SmartRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [lastTime, setLastTime] = useState<Date | null>(lastUpdated ?? null);
  const [timeStr, setTimeStr] = useState("");
  const [phase, setPhase] = useState<RefreshPhase>("idle");
  const [bannerContent, setBannerContent] = useState<RefreshPhase | "stale">("idle");
  const pullProgRef = useRef(0);
  const [pullProg, setPullProg] = useState(0);
  const indicatorOpacityAnim = useRef(new Animated.Value(0)).current;
  const indicatorScaleAnim = useRef(new Animated.Value(0.3)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setLastTime(lastUpdated ?? null);
  }, [lastUpdated]);

  useEffect(() => {
    setTimeStr(formatLastUpdated(lastTime));
    const iv = setInterval(() => setTimeStr(formatLastUpdated(lastTime)), 15000);
    return () => clearInterval(iv);
  }, [lastTime]);

  useEffect(() => {
    const isStale = !!timeStr && timeStr !== "Just now";
    if (phase === "refreshing") {
      setBannerContent("refreshing");
      Animated.spring(bannerAnim, {
        toValue: 1,
        tension: 60,
        friction: 10,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    } else if (phase === "success") {
      setBannerContent("success");
      Animated.timing(bannerAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== "web",
      }).start();
    } else if (phase === "pulling" || phase === "ready") {
      Animated.timing(bannerAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    } else if (phase === "idle") {
      if (isStale) {
        setBannerContent("stale");
        Animated.timing(bannerAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }).start();
      }
    }
  }, [phase, timeStr]);

  const doRefresh = useCallback(async () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setPhase("refreshing");
    setRefreshing(true);

    Animated.parallel([
      Animated.spring(indicatorOpacityAnim, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.spring(indicatorScaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();

    try {
      await onRefresh();
      if (mountedRef.current) setLastTime(new Date());
    } catch {}

    if (!mountedRef.current) return;

    setRefreshing(false);
    setPhase("success");
    setPullProg(0);
    pullProgRef.current = 0;

    Animated.parallel([
      Animated.timing(indicatorOpacityAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(indicatorScaleAnim, {
        toValue: 0.3,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();

    successTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      Animated.timing(bannerAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== "web",
      }).start(() => {
        if (mountedRef.current) setPhase("idle");
      });
    }, 1200);
  }, [onRefresh]);

  const scrollY = useRef(0);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    scrollY.current = y;
    if (isWeb && y < 0 && !refreshing) {
      const progress = Math.min(Math.abs(y) / PULL_THRESHOLD, 1);
      pullProgRef.current = progress;
      setPullProg(progress);

      indicatorOpacityAnim.setValue(Math.min(progress * 1.5, 1));
      indicatorScaleAnim.setValue(0.3 + progress * 0.7);

      if (progress >= 1) {
        setPhase("ready");
      } else if (progress > 0) {
        setPhase("pulling");
      }
    }
    scrollProps.onScroll?.(e);
  }, [refreshing, isWeb]);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isWeb && scrollY.current < -PULL_THRESHOLD && !refreshing) {
      doRefresh();
    } else if (isWeb && !refreshing) {
      setPhase("idle");
      pullProgRef.current = 0;

      Animated.parallel([
        Animated.timing(indicatorOpacityAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(indicatorScaleAnim, {
          toValue: 0.3,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start(() => {
        if (mountedRef.current) setPullProg(0);
      });
    }
    scrollProps.onScrollEndDrag?.(e);
  }, [isWeb, refreshing, doRefresh]);

  const nativeDoRefresh = useCallback(async () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setPhase("refreshing");
    setRefreshing(true);
    try {
      await onRefresh();
      if (mountedRef.current) setLastTime(new Date());
    } catch {}
    if (!mountedRef.current) return;
    setRefreshing(false);
    setPhase("success");
    successTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setPhase("idle");
    }, 1200);
  }, [onRefresh]);

  if (!isWeb) {
    const nativeTitle = phase === "refreshing"
      ? "Refreshing..."
      : phase === "success"
        ? "Updated ✓"
        : timeStr
          ? `Updated ${timeStr}`
          : "Pull to refresh";

    return (
      <ScrollView
        {...scrollProps}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={nativeDoRefresh}
            tintColor={accentColor}
            colors={[accentColor, C.accent, C.success]}
            progressBackgroundColor={C.surface}
            title={nativeTitle}
            titleColor={phase === "success" ? C.success : C.textMuted}
          />
        }
      >
        {children}
        {timeStr ? (
          <View style={ts.wrap}>
            <Text style={ts.text}>Updated {timeStr}</Text>
          </View>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBanner phase={phase} timeStr={timeStr} accentColor={accentColor} bannerAnim={bannerAnim} bannerContent={bannerContent} />

      <Animated.View style={[
        pi.wrap,
        {
          opacity: indicatorOpacityAnim,
          transform: [{ scale: indicatorScaleAnim }],
        },
      ]}>
        <View style={[pi.circle, { borderColor: accentColor + "15" }]}>
          <CircularArcIndicator
            progress={pullProg}
            phase={phase}
            color={accentColor}
          />
        </View>
        <PullLabel phase={phase} />
      </Animated.View>

      <ScrollView
        {...scrollProps}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEnd}
        scrollEventThrottle={16}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const pi = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 36,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
    pointerEvents: "none" as const,
  },
  circle: {
    width: INDICATOR_SIZE + 8,
    height: INDICATOR_SIZE + 8,
    borderRadius: (INDICATOR_SIZE + 8) / 2,
    backgroundColor: C.surface,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: { boxShadow: "0 2px 12px rgba(0,0,0,0.1)" },
      default: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
    }),
  },
  iconOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 16,
    fontWeight: "700",
  },
  labelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
});

const banner = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    zIndex: 50,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 18,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  successIcon: {
    fontSize: 14,
    fontWeight: "700",
  },
  timeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: C.textMuted,
  },
});

const ts = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
  },
  text: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: C.textMuted,
  },
});
