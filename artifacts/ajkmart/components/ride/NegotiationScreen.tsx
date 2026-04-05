import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useToast } from "@/context/ToastContext";
import { CancelModal } from "@/components/CancelModal";
import type { CancelTarget } from "@/components/CancelModal";
import { RT } from "@/constants/rideTokens";
import { BidCardSkeleton } from "@/components/ride/Skeletons";
import {
  acceptRideBid as acceptRideBidApi,
  customerCounterOffer as customerCounterOfferApi,
} from "@workspace/api-client-react";
import { API_BASE } from "@/utils/api";

interface RideBid {
  id: string;
  riderId: string;
  riderName?: string;
  fare: number;
  offer?: number;
  status?: string;
  createdAt?: string;
  ratingAvg?: number | null;
  totalRides?: number;
  vehiclePlate?: string | null;
  vehicleType?: string | null;
  note?: string | null;
}

interface NegotiationRide {
  id: string;
  status: string;
  fare?: number;
  offeredFare?: number;
  minOffer?: number;
  paymentMethod?: string;
  bids?: RideBid[];
  riderId?: string;
  riderName?: string;
  pickupAddress?: string;
  dropAddress?: string;
  broadcastExpiresAt?: string | null;
}

type NegotiationScreenProps = {
  rideId: string;
  ride: NegotiationRide | null;
  setRide: (updater: (r: NegotiationRide | null) => NegotiationRide | null) => void;
  elapsed: number;
  cancellationFee: number;
  token: string | null;
  broadcastTimeoutSec?: number;
  estimatedFare?: number;
  minOffer?: number;
};

export function NegotiationScreen({
  rideId,
  ride,
  setRide,
  elapsed,
  cancellationFee,
  token,
  broadcastTimeoutSec = 300,
  estimatedFare,
  minOffer: minOfferProp,
}: NegotiationScreenProps) {
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { showToast } = useToast();

  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;
  const ring3 = useRef(new Animated.Value(1)).current;
  const ring4 = useRef(new Animated.Value(1)).current;
  const ring1Op = useRef(new Animated.Value(0.6)).current;
  const ring2Op = useRef(new Animated.Value(0.4)).current;
  const ring3Op = useRef(new Animated.Value(0.22)).current;
  const ring4Op = useRef(new Animated.Value(0.12)).current;

  const livePulse = useRef(new Animated.Value(1)).current;
  const livePulseOp = useRef(new Animated.Value(1)).current;
  const centerBounce = useRef(new Animated.Value(1)).current;

  const updateOfferSlide = useRef(new Animated.Value(0)).current;

  const [updateOfferInput, setUpdateOfferInput] = useState("");
  const [updateOfferLoading, setUpdateOfferLoading] = useState(false);
  const [showUpdateOffer, setShowUpdateOffer] = useState(false);
  const [acceptBidId, setAcceptBidId] = useState<string | null>(null);
  const [cancelModalTarget, setCancelModalTarget] =
    useState<CancelTarget | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [offerError, setOfferError] = useState("");
  const [connectionLost, setConnectionLost] = useState(false);
  const [bidsInitializing, setBidsInitializing] = useState(true);
  const consecutiveFailsRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setBidsInitializing(false), 3500);
    return () => clearTimeout(t);
  }, []);

  const rideApiBase = API_BASE;

  useEffect(() => {
    const pulse = (
      scale: Animated.Value,
      op: Animated.Value,
      delay: number,
      resetOp: number,
    ) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, { toValue: 1.7, duration: 1500, useNativeDriver: true }),
            Animated.timing(op, { toValue: 0, duration: 1500, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(op, { toValue: resetOp, duration: 0, useNativeDriver: true }),
          ]),
        ]),
      );
    const a1 = pulse(ring1, ring1Op, 0, 0.6);
    const a2 = pulse(ring2, ring2Op, 380, 0.4);
    const a3 = pulse(ring3, ring3Op, 760, 0.22);
    const a4 = pulse(ring4, ring4Op, 1140, 0.12);
    a1.start(); a2.start(); a3.start(); a4.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); a4.stop(); };
  }, []);

  useEffect(() => {
    const livePulseAnim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(livePulse, { toValue: 1.5, duration: 600, useNativeDriver: true }),
          Animated.timing(livePulseOp, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(livePulse, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(livePulseOp, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      ]),
    );
    livePulseAnim.start();

    const bounceAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(centerBounce, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(centerBounce, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    bounceAnim.start();

    return () => { livePulseAnim.stop(); bounceAnim.stop(); };
  }, []);

  useEffect(() => {
    Animated.timing(updateOfferSlide, {
      toValue: showUpdateOffer ? 1 : 0,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [showUpdateOffer]);

  useEffect(() => {
    const HEARTBEAT_MS = 15000;
    const FAIL_THRESHOLD = 2;
    const interval = setInterval(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(`${rideApiBase}/rides/${rideId}`, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          consecutiveFailsRef.current = 0;
          setConnectionLost(false);
        } else {
          consecutiveFailsRef.current++;
        }
      } catch {
        clearTimeout(timeout);
        consecutiveFailsRef.current++;
      }
      if (consecutiveFailsRef.current >= FAIL_THRESHOLD) {
        setConnectionLost(true);
      }
    }, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [rideId, token, rideApiBase]);

  const offeredFare = ride?.offeredFare ?? 0;
  const bids: RideBid[] = ride?.bids ?? [];
  const sortedBids = [...bids].sort((a, b) => a.fare - b.fare);
  const hasBids = bids.length > 0;
  const elapsedStr =
    elapsed < 60
      ? `${elapsed}s`
      : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;

  const remaining = ride?.broadcastExpiresAt
    ? Math.max(0, Math.floor((new Date(ride.broadcastExpiresAt).getTime() - Date.now()) / 1000))
    : Math.max(0, broadcastTimeoutSec - elapsed);
  const remainingMin = Math.floor(remaining / 60);
  const remainingSec = remaining % 60;
  const timerStr = `${remainingMin}:${String(remainingSec).padStart(2, "0")}`;
  const timerPct = broadcastTimeoutSec > 0 ? remaining / broadcastTimeoutSec : 1;
  const timerUrgent = timerPct < 0.2;

  const serverMinOffer = ride?.minOffer ?? minOfferProp;
  const minCounterOffer = serverMinOffer
    ? Math.ceil(serverMinOffer)
    : estimatedFare
      ? Math.ceil(estimatedFare * 0.7)
      : Math.ceil(offeredFare * 0.7);

  const validateOffer = (val: string): string => {
    const amt = parseFloat(val);
    if (isNaN(amt) || amt <= 0) return "Please enter a valid amount";
    if (amt < minCounterOffer) return `Minimum offer is Rs. ${minCounterOffer}`;
    return "";
  };

  const acceptBid = async (bidId: string) => {
    setAcceptBidId(bidId);
    try {
      const d = await acceptRideBidApi(rideId, { bidId });
      setRide(() => d as unknown as NegotiationRide);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error || e?.message || "Could not accept bid. Please try again.";
      showToast(msg, "error");
    }
    setAcceptBidId(null);
  };

  const sendUpdateOffer = async () => {
    const err = validateOffer(updateOfferInput);
    if (err) {
      setOfferError(err);
      showToast(err, "error");
      return;
    }
    const amt = parseFloat(updateOfferInput);
    setUpdateOfferLoading(true);
    setOfferError("");
    try {
      const d = await customerCounterOfferApi(rideId, { offeredFare: amt });
      setRide(() => d as unknown as NegotiationRide);
      setUpdateOfferInput("");
      setShowUpdateOffer(false);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error || e?.message || "Could not update offer. Please try again.";
      showToast(msg, "error");
    }
    setUpdateOfferLoading(false);
  };

  const openUnifiedCancelModal = () => {
    const riderAssigned = ["accepted", "arrived", "in_transit"].includes(ride?.status || "");
    setCancelModalTarget({
      id: rideId,
      type: "ride",
      status: ride?.status || "bargaining",
      fare: ride?.fare,
      paymentMethod: ride?.paymentMethod,
      riderAssigned,
    });
  };

  const updateOfferMaxHeight = updateOfferSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220],
  });
  const updateOfferOpacity = updateOfferSlide.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={{ flex: 1, backgroundColor: RT.dark }}>
        <LinearGradient
          colors={RT.headerGrad}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />

        {/* Header */}
        <View style={{ paddingTop: topPad + 16, paddingHorizontal: 20, paddingBottom: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push("/(tabs)")}
                hitSlop={8}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 13,
                  backgroundColor: "rgba(255,255,255,0.10)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                }}
              >
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: RT.textPrimary }}>
                    Live Negotiation
                  </Text>
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    backgroundColor: RT.emeraldBg,
                    borderRadius: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderWidth: 1,
                    borderColor: RT.emeraldBorder,
                  }}>
                    <Animated.View style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: RT.emerald,
                      transform: [{ scale: livePulse }],
                      opacity: livePulseOp,
                    }} />
                    <Text style={{ fontFamily: "Inter_700Bold", fontSize: 9, color: RT.emerald, letterSpacing: 0.8 }}>LIVE</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: RT.textMuted, marginTop: 2 }}>
                  #{rideId.slice(-8).toUpperCase()} · {elapsedStr}
                </Text>
              </View>
            </View>

            {/* Your offer pill */}
            <View style={{
              backgroundColor: RT.accentBg,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 10,
              alignItems: "center",
              borderWidth: 1.5,
              borderColor: RT.accentBorder,
            }}>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 22, color: RT.accent }}>
                Rs. {offeredFare}
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(252,211,77,0.65)" }}>
                Your Offer
              </Text>
            </View>
          </View>
        </View>

        {/* Timer bar */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, gap: 10 }}>
          <Ionicons name="timer-outline" size={16} color={timerUrgent ? RT.red : RT.textMuted} />
          <View style={{ flex: 1, height: 5, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
            <Animated.View style={{
              height: 5,
              borderRadius: 3,
              width: `${Math.max(timerPct * 100, 0)}%`,
              backgroundColor: timerUrgent ? RT.red : RT.accent,
            }} />
          </View>
          <View style={{
            backgroundColor: timerUrgent ? RT.redBg : RT.accentBg,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: timerUrgent ? RT.redBorder : RT.accentBorder,
          }}>
            <Text style={{
              fontFamily: "Inter_700Bold",
              fontSize: 13,
              color: timerUrgent ? RT.red : RT.accent,
              minWidth: 38,
              textAlign: "center",
            }}>
              {timerStr}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 160, gap: 14 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Broadcast waiting / no bids */}
          {!hasBids && (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              {/* Radar / ripple animation */}
              <View style={{ width: 220, height: 220, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                {/* 4 rings for more impressive radar effect */}
                <Animated.View style={{
                  position: "absolute",
                  width: 220,
                  height: 220,
                  borderRadius: 110,
                  borderWidth: 1.5,
                  borderColor: "rgba(252,211,77,0.25)",
                  transform: [{ scale: ring4 }],
                  opacity: ring4Op,
                }} />
                <Animated.View style={{
                  position: "absolute",
                  width: 170,
                  height: 170,
                  borderRadius: 85,
                  borderWidth: 1.5,
                  borderColor: "rgba(252,211,77,0.35)",
                  transform: [{ scale: ring3 }],
                  opacity: ring3Op,
                }} />
                <Animated.View style={{
                  position: "absolute",
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  borderWidth: 2,
                  borderColor: "rgba(252,211,77,0.5)",
                  transform: [{ scale: ring2 }],
                  opacity: ring2Op,
                }} />
                <Animated.View style={{
                  position: "absolute",
                  width: 78,
                  height: 78,
                  borderRadius: 39,
                  borderWidth: 2,
                  borderColor: "rgba(252,211,77,0.65)",
                  transform: [{ scale: ring1 }],
                  opacity: ring1Op,
                }} />

                {/* Center icon with bounce */}
                <Animated.View style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: "rgba(252,211,77,0.18)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "rgba(252,211,77,0.45)",
                  transform: [{ scale: centerBounce }],
                  shadowColor: RT.accent,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.45,
                  shadowRadius: 20,
                  elevation: 8,
                }}>
                  <Ionicons name="radio-outline" size={34} color={RT.accent} />
                </Animated.View>
              </View>

              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 22, color: RT.textPrimary, textAlign: "center" }}>
                Broadcasting Your Offer
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: RT.textSecondary, textAlign: "center", marginTop: 8, lineHeight: 20, maxWidth: 260 }}>
                Nearby riders are reviewing your offer of{" "}
                <Text style={{ fontFamily: "Inter_700Bold", color: RT.accent }}>Rs. {offeredFare}</Text>
                . Bids will appear here instantly.
              </Text>

              {/* Broadcast elapsed pill */}
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                backgroundColor: "rgba(255,255,255,0.07)",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 8,
                marginTop: 16,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
              }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: RT.accent }} />
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: RT.textSecondary }}>
                  Broadcasting · {elapsedStr}
                </Text>
              </View>

              {connectionLost && (
                <View style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: RT.redBg,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: RT.redBorder,
                }}>
                  <Ionicons name="cloud-offline-outline" size={16} color={RT.red} />
                  <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: "#FCA5A5" }}>
                    Connection lost — tap below to reconnect
                  </Text>
                </View>
              )}

              {(remaining <= 0 || connectionLost) && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={async () => {
                    try {
                      const res = await fetch(`${rideApiBase}/rides/${rideId}/retry`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                      });
                      if (res.ok) {
                        setConnectionLost(false);
                        showToast("Searching for more riders...", "success");
                      } else {
                        showToast("Could not refresh. Please try again.", "error");
                      }
                    } catch {
                      setConnectionLost(true);
                      showToast("Connection issue. Please try again.", "error");
                    }
                  }}
                  style={{
                    marginTop: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: RT.accentBg,
                    borderRadius: 16,
                    paddingHorizontal: 22,
                    paddingVertical: 14,
                    borderWidth: 1.5,
                    borderColor: RT.accentBorder,
                  }}
                >
                  <Ionicons name="refresh-outline" size={18} color={RT.accent} />
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: RT.accent }}>
                    {connectionLost ? "Reconnect & Search Again" : "Refresh & Search Again"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Bids loading skeleton — first 3.5 seconds with no bids */}
          {bidsInitializing && !hasBids && (
            <BidCardSkeleton />
          )}

          {/* Bids */}
          {hasBids && (
            <>
              {/* Bids count header */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: RT.emerald }} />
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: RT.textSecondary }}>
                  {bids.length} Bid{bids.length > 1 ? "s" : ""} Received
                </Text>
                <View style={{ flex: 1 }} />
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: RT.textMuted }}>
                  Sorted by price
                </Text>
              </View>

              {sortedBids.map((bid: RideBid, bidIndex: number) => {
                const isAccepting = acceptBidId === bid.id;
                const isBestOffer = bidIndex === 0;
                const fareGap = Math.round(bid.fare - offeredFare);

                return (
                  <Reanimated.View
                    key={bid.id}
                    entering={FadeInDown.delay(bidIndex * 80).springify().damping(18)}
                    style={{
                      borderRadius: 22,
                      overflow: "hidden",
                      borderWidth: isBestOffer ? 1.5 : 1,
                      borderColor: isBestOffer ? RT.emeraldBorder : RT.darkCardBorder,
                    }}
                  >
                    <LinearGradient
                      colors={
                        isBestOffer
                          ? ["rgba(16,185,129,0.12)", "rgba(16,185,129,0.04)"]
                          : ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]
                      }
                      style={{ padding: 18 }}
                    >
                      {isBestOffer && (
                        <View style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                          marginBottom: 12,
                          backgroundColor: "rgba(16,185,129,0.15)",
                          alignSelf: "flex-start",
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}>
                          <Ionicons name="ribbon" size={12} color={RT.emerald} />
                          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 10, color: RT.emerald, letterSpacing: 0.8 }}>
                            BEST OFFER
                          </Text>
                        </View>
                      )}

                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 }}>
                        {/* Avatar */}
                        <View style={{ position: "relative" }}>
                          <LinearGradient
                            colors={
                              isBestOffer
                                ? ["rgba(16,185,129,0.35)", "rgba(16,185,129,0.15)"]
                                : ["rgba(252,211,77,0.25)", "rgba(252,211,77,0.10)"]
                            }
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 28,
                              alignItems: "center",
                              justifyContent: "center",
                              borderWidth: 2,
                              borderColor: isBestOffer ? "rgba(16,185,129,0.55)" : "rgba(252,211,77,0.35)",
                            }}
                          >
                            <Text style={{
                              fontFamily: "Inter_700Bold",
                              fontSize: 22,
                              color: isBestOffer ? RT.emerald : RT.accent,
                            }}>
                              {(bid.riderName ?? "R").charAt(0).toUpperCase()}
                            </Text>
                          </LinearGradient>
                          <View style={{
                            position: "absolute",
                            bottom: 0,
                            right: 0,
                            width: 14,
                            height: 14,
                            borderRadius: 7,
                            backgroundColor: RT.emerald,
                            borderWidth: 2.5,
                            borderColor: RT.dark,
                          }} />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: RT.textPrimary }}>
                            {bid.riderName ?? "Rider"}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 5, flexWrap: "wrap" }}>
                            {bid.ratingAvg != null && (
                              <View style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 3,
                                backgroundColor: "rgba(245,158,11,0.15)",
                                borderRadius: 8,
                                paddingHorizontal: 7,
                                paddingVertical: 3,
                              }}>
                                <Ionicons name="star" size={11} color="#F59E0B" />
                                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 11, color: RT.accent }}>
                                  {bid.ratingAvg.toFixed(1)}
                                </Text>
                                {(bid.totalRides ?? 0) > 0 && (
                                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10, color: RT.textMuted }}>
                                    · {bid.totalRides} trips
                                  </Text>
                                )}
                              </View>
                            )}
                            {bid.vehiclePlate && (
                              <View style={{
                                backgroundColor: "rgba(255,255,255,0.10)",
                                borderRadius: 7,
                                paddingHorizontal: 7,
                                paddingVertical: 3,
                                borderWidth: 1,
                                borderColor: RT.darkCardBorder,
                              }}>
                                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 10, color: "rgba(255,255,255,0.8)", letterSpacing: 1.2 }}>
                                  {bid.vehiclePlate}
                                </Text>
                              </View>
                            )}
                            {bid.vehicleType && (
                              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: RT.textMuted }}>
                                {bid.vehicleType}
                              </Text>
                            )}
                          </View>
                          {bid.note ? (
                            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: RT.textSecondary, marginTop: 5, fontStyle: "italic" }}>
                              "{bid.note}"
                            </Text>
                          ) : null}
                          {bid.ratingAvg == null && bid.totalRides === 0 && (
                            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: RT.textMuted, marginTop: 3 }}>
                              New rider
                            </Text>
                          )}
                        </View>

                        {/* Fare badge */}
                        <View style={{ alignItems: "flex-end" }}>
                          <View style={{
                            backgroundColor: RT.accentBg,
                            borderRadius: 14,
                            paddingHorizontal: 13,
                            paddingVertical: 8,
                            borderWidth: 1,
                            borderColor: RT.accentBorder,
                            marginBottom: 4,
                          }}>
                            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 22, color: RT.accent }}>
                              Rs. {Math.round(bid.fare)}
                            </Text>
                          </View>
                          <Text style={{
                            fontFamily: "Inter_500Medium",
                            fontSize: 10,
                            color: bid.fare <= offeredFare ? RT.emerald : RT.textMuted,
                            textAlign: "right",
                          }}>
                            {bid.fare === offeredFare
                              ? "Matches your offer"
                              : fareGap > 0
                                ? `+Rs. ${fareGap} above`
                                : `-Rs. ${Math.abs(fareGap)} saved`}
                          </Text>
                        </View>
                      </View>

                      {/* Accept + Counter row */}
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        {/* Accept */}
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => acceptBid(bid.id)}
                          disabled={acceptBidId !== null}
                          style={{ flex: 3, opacity: acceptBidId !== null ? 0.6 : 1 }}
                        >
                          <LinearGradient
                            colors={["#10B981", "#059669"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{
                              borderRadius: 16,
                              paddingVertical: 15,
                              alignItems: "center",
                              flexDirection: "row",
                              justifyContent: "center",
                              gap: 7,
                            }}
                          >
                            {isAccepting ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-circle" size={17} color="#fff" />
                                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" }}>
                                  Accept · Rs. {Math.round(bid.fare)}
                                </Text>
                              </>
                            )}
                          </LinearGradient>
                        </TouchableOpacity>

                        {/* Counter */}
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            setUpdateOfferInput(String(Math.round(bid.fare)));
                            setShowUpdateOffer(true);
                          }}
                          disabled={acceptBidId !== null}
                          style={{
                            flex: 2,
                            borderRadius: 16,
                            paddingVertical: 15,
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "row",
                            gap: 6,
                            borderWidth: 1.5,
                            borderColor: RT.accentBorder,
                            backgroundColor: RT.accentBg,
                            opacity: acceptBidId !== null ? 0.5 : 1,
                          }}
                        >
                          <Ionicons name="swap-horizontal" size={15} color={RT.accent} />
                          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: RT.accent }}>
                            Counter
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </Reanimated.View>
                );
              })}
            </>
          )}

          {/* Counter-offer panel */}
          <View style={{ borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: RT.darkCardBorder }}>
            <LinearGradient colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]} style={{ overflow: "hidden" }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => { setShowUpdateOffer((v) => !v); setOfferError(""); }}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{
                    width: 34,
                    height: 34,
                    borderRadius: 11,
                    backgroundColor: RT.accentBg,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: RT.accentBorder,
                  }}>
                    <Ionicons name="create-outline" size={17} color={RT.accent} />
                  </View>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: RT.textPrimary }}>
                    Update Your Offer
                  </Text>
                </View>
                <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={showUpdateOffer ? "chevron-up" : "chevron-down"} size={14} color={RT.textMuted} />
                </View>
              </TouchableOpacity>

              <Animated.View style={{ maxHeight: updateOfferMaxHeight, opacity: updateOfferOpacity, overflow: "hidden" }}>
                <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
                  <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginBottom: 4 }} />
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: RT.textMuted }}>
                    A new offer cancels all pending bids · Min: Rs. {minCounterOffer}
                  </Text>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10, color: RT.textMuted }}>Rs. {minCounterOffer}</Text>
                    <View style={{ flex: 1, height: 3, backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 2 }}>
                      <View style={{
                        width: updateOfferInput ? `${Math.min(100, Math.max(0, (parseFloat(updateOfferInput) - minCounterOffer) / (offeredFare * 2 - minCounterOffer) * 100))}%` : "0%",
                        height: 3,
                        backgroundColor: RT.accent,
                        borderRadius: 2,
                      }} />
                    </View>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10, color: RT.textMuted }}>Rs. {Math.ceil(offeredFare * 1.5)}</Text>
                  </View>

                  {offerError ? (
                    <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: RT.red }}>{offerError}</Text>
                  ) : null}

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      borderRadius: 13,
                      paddingHorizontal: 14,
                      borderWidth: 1,
                      borderColor: offerError ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)",
                    }}>
                      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: RT.textMuted }}>Rs.</Text>
                      <TextInput
                        value={updateOfferInput}
                        onChangeText={(v) => { setUpdateOfferInput(v); setOfferError(""); }}
                        keyboardType="numeric"
                        placeholder={String(Math.ceil(offeredFare * 1.1))}
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        maxLength={7}
                        style={{
                          flex: 1,
                          fontFamily: "Inter_700Bold",
                          fontSize: 20,
                          color: "#fff",
                          paddingVertical: 12,
                          paddingHorizontal: 6,
                        }}
                      />
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={sendUpdateOffer}
                      disabled={updateOfferLoading || !updateOfferInput}
                      style={{ opacity: !updateOfferInput || updateOfferLoading ? 0.5 : 1 }}
                    >
                      <LinearGradient
                        colors={["#F59E0B", "#D97706"]}
                        style={{ borderRadius: 13, paddingHorizontal: 20, height: "100%", alignItems: "center", justifyContent: "center", minHeight: 52 }}
                      >
                        {updateOfferLoading ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" }}>Send</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            </LinearGradient>
          </View>
        </ScrollView>

        {/* Cancel — subtle text link at bottom */}
        <View style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 24) + 8,
          alignItems: "center",
        }}>
          <LinearGradient
            colors={["transparent", "rgba(10,15,30,0.97)"]}
            style={{ position: "absolute", top: -32, left: 0, right: 0, bottom: 0 }}
          />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => openUnifiedCancelModal()}
            disabled={cancelling}
            style={{ paddingVertical: 12, paddingHorizontal: 24 }}
          >
            {cancelling ? (
              <ActivityIndicator color={RT.red} size="small" />
            ) : (
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: RT.textMuted }}>
                Cancel Offer
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {cancelModalTarget && (
          <CancelModal
            target={cancelModalTarget}
            cancellationFee={cancellationFee}
            apiBase={rideApiBase}
            token={token}
            onClose={() => setCancelModalTarget(null)}
            onDone={(result) => {
              setRide((r: NegotiationRide | null) =>
                r ? { ...r, status: "cancelled" } : r,
              );
            }}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
