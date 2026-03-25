import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

const C = Colors.light;
const { width } = Dimensions.get("window");
const CARD_GAP = 12;
const H_PAD = 16;
const INNER = width - H_PAD * 2;
const HALF = (INNER - CARD_GAP) / 2;

/* ── animated press wrapper ── */
function Tappable({
  children,
  onPress,
  style,
  delay = 0,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
  delay?: number;
}) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, delay, bounciness: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
    onPress();
  };

  return (
    <Animated.View style={[{ opacity, transform: [{ scale }] }, style]}>
      <Pressable onPressIn={pressIn} onPressOut={pressOut} style={{ flex: 1 }}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

/* ── HERO CARD — AJKMart Grocery ── */
function HeroCard({ onPress }: { onPress: () => void }) {
  return (
    <Tappable onPress={onPress} style={styles.heroWrapper} delay={80}>
      <LinearGradient
        colors={["#1A56DB", "#2563EB", "#3B82F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        {/* background pattern circles */}
        <View style={[styles.circle, { width: 160, height: 160, top: -40, right: -30, opacity: 0.12 }]} />
        <View style={[styles.circle, { width: 90, height: 90, bottom: 10, right: 60, opacity: 0.1 }]} />

        <View style={styles.heroLeft}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>🛒  Grocery</Text>
          </View>
          <Text style={styles.heroTitle}>AJKMart</Text>
          <Text style={styles.heroSub}>Fresh groceries & daily{"\n"}essentials delivered fast</Text>
          <View style={styles.heroBtn}>
            <Text style={styles.heroBtnText}>Shop Now</Text>
            <Ionicons name="arrow-forward" size={13} color={C.primary} />
          </View>
        </View>

        <View style={styles.heroRight}>
          <View style={styles.heroIconRing}>
            <Ionicons name="storefront" size={42} color="#fff" />
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>500+</Text>
              <Text style={styles.heroStatLab}>Products</Text>
            </View>
            <View style={styles.heroStatDiv} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>20 min</Text>
              <Text style={styles.heroStatLab}>Delivery</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Tappable>
  );
}

/* ── FOOD CARD ── */
function FoodCard({ onPress }: { onPress: () => void }) {
  return (
    <Tappable onPress={onPress} style={[styles.halfWrapper, { height: 170 }]} delay={160}>
      <LinearGradient
        colors={["#FFFBEB", "#FEF3C7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.halfCard}
      >
        <View style={[styles.circle, { width: 100, height: 100, top: -25, right: -25, backgroundColor: "#F59E0B", opacity: 0.12 }]} />
        <View style={styles.halfIconBox}>
          <LinearGradient colors={["#F59E0B", "#FBBF24"]} style={styles.halfIconGrad}>
            <Ionicons name="restaurant" size={24} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={[styles.halfTitle, { color: "#92400E" }]}>Food{"\n"}Delivery</Text>
        <Text style={[styles.halfSub, { color: "#B45309" }]}>Restaurants{"\n"}near you</Text>
        <View style={[styles.halfTag, { backgroundColor: "#FDE68A" }]}>
          <Ionicons name="time-outline" size={11} color="#92400E" />
          <Text style={[styles.halfTagText, { color: "#92400E" }]}>30 min</Text>
        </View>
      </LinearGradient>
    </Tappable>
  );
}

/* ── RIDE CARD ── */
function RideCard({ onPress }: { onPress: () => void }) {
  return (
    <Tappable onPress={onPress} style={[styles.halfWrapper, { height: 170 }]} delay={240}>
      <LinearGradient
        colors={["#F0FDF4", "#DCFCE7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.halfCard}
      >
        <View style={[styles.circle, { width: 100, height: 100, top: -25, right: -25, backgroundColor: "#10B981", opacity: 0.12 }]} />
        <View style={styles.halfIconBox}>
          <LinearGradient colors={["#10B981", "#34D399"]} style={styles.halfIconGrad}>
            <Ionicons name="car" size={24} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={[styles.halfTitle, { color: "#065F46" }]}>Bike &{"\n"}Car Ride</Text>
        <Text style={[styles.halfSub, { color: "#047857" }]}>Safe & fast{"\n"}booking</Text>
        <View style={[styles.halfTag, { backgroundColor: "#A7F3D0" }]}>
          <Ionicons name="flash-outline" size={11} color="#065F46" />
          <Text style={[styles.halfTagText, { color: "#065F46" }]}>Instant</Text>
        </View>
      </LinearGradient>
    </Tappable>
  );
}

/* ── WALLET CARD ── */
function WalletCard({ balance, onPress }: { balance: number; onPress: () => void }) {
  return (
    <Tappable onPress={onPress} style={styles.walletWrapper} delay={320}>
      <View style={styles.walletCard}>
        <View style={styles.walletLeft}>
          <View style={styles.walletIconCircle}>
            <Ionicons name="wallet" size={22} color={C.primary} />
          </View>
          <View>
            <Text style={styles.walletLabel}>AJKMart Wallet</Text>
            <Text style={styles.walletBal}>Rs. {balance.toLocaleString()}</Text>
          </View>
        </View>
        <View style={styles.walletRight}>
          <View style={styles.walletTopUpBtn}>
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={styles.walletTopUpText}>Top Up</Text>
          </View>
        </View>
      </View>
    </Tappable>
  );
}

/* ── QUICK ACTION PILL ── */
function QuickPill({
  icon,
  label,
  color,
  bg,
  onPress,
  delay,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
  delay: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const tx = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(tx, { toValue: 0, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY: tx }] }}>
      <Pressable onPress={onPress} style={styles.quickPill}>
        <View style={[styles.quickPillIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={styles.quickPillLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

/* ── PROMO BANNER ── */
function PromoBanner({
  title,
  desc,
  tag,
  c1,
  c2,
  icon,
}: {
  title: string;
  desc: string;
  tag: string;
  c1: string;
  c2: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.promoBanner}>
      <View style={[styles.circle, { width: 80, height: 80, top: -20, right: 50, opacity: 0.15 }]} />
      <View style={{ flex: 1 }}>
        <View style={styles.promoTag}>
          <Text style={styles.promoTagText}>{tag}</Text>
        </View>
        <Text style={styles.promoTitle}>{title}</Text>
        <Text style={styles.promoDesc}>{desc}</Text>
      </View>
      <Ionicons name={icon} size={52} color="rgba(255,255,255,0.25)" />
    </LinearGradient>
  );
}

/* ══════════════════════════════════ MAIN SCREEN ══════════════════════════════════ */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const headerAnim = useRef(new Animated.Value(0)).current;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const quickActions = [
    { icon: "leaf-outline" as const, label: "Fruits", color: C.mart, bg: C.martLight, route: "/mart" },
    { icon: "fish-outline" as const, label: "Meat", color: "#EF4444", bg: "#FEE2E2", route: "/mart" },
    { icon: "pizza-outline" as const, label: "Pizza", color: C.food, bg: C.foodLight, route: "/food" },
    { icon: "bicycle-outline" as const, label: "Bike", color: "#8B5CF6", bg: "#EDE9FE", route: "/ride" },
    { icon: "cafe-outline" as const, label: "Drinks", color: "#0891B2", bg: "#E0F2FE", route: "/mart" },
    { icon: "time-outline" as const, label: "Track", color: C.primary, bg: C.rideLight, route: "/(tabs)/orders" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      {/* ── HEADER ── */}
      <Animated.View style={{ opacity: headerAnim }}>
        <LinearGradient
          colors={["#0F3BA8", C.primary, "#2563EB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: topPad + 14 }]}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>
                {user?.name ? `Salam, ${user.name.split(" ")[0]} 👋` : "Salam! 👋"}
              </Text>
              <Text style={styles.headerTitle}>Kya chahiye aaj?</Text>
              <View style={styles.locRow}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.75)" />
                <Text style={styles.locText}>AJK, Pakistan</Text>
              </View>
            </View>
            <Pressable onPress={() => router.push("/cart")} style={styles.cartBubble}>
              <Ionicons name="bag-outline" size={22} color="#fff" />
              {itemCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{itemCount > 9 ? "9+" : itemCount}</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* search bar */}
          <Pressable onPress={() => router.push("/mart")} style={styles.searchBar}>
            <View style={styles.searchIcon}>
              <Ionicons name="search" size={16} color={C.primary} />
            </View>
            <Text style={styles.searchText}>Products, food, restaurants...</Text>
            <View style={styles.searchFilter}>
              <Ionicons name="options-outline" size={16} color={C.textMuted} />
            </View>
          </Pressable>
        </LinearGradient>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── SECTION LABEL ── */}
        <View style={styles.secRow}>
          <Text style={styles.secTitle}>Our Services</Text>
          <Text style={styles.secSub}>Sab kuch ek jagah</Text>
        </View>

        {/* ── BENTO GRID ── */}
        <View style={styles.bentoGrid}>

          {/* ROW 1 — Hero full width */}
          <HeroCard onPress={() => router.push("/mart")} />

          {/* ROW 2 — Food + Ride side by side */}
          <View style={styles.halfRow}>
            <FoodCard onPress={() => router.push("/food")} />
            <RideCard onPress={() => router.push("/ride")} />
          </View>

          {/* ROW 3 — Wallet wide */}
          <WalletCard
            balance={user?.walletBalance || 0}
            onPress={() => router.push("/(tabs)/wallet")}
          />
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={styles.secRow}>
          <Text style={styles.secTitle}>Quick Order</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}
        >
          {quickActions.map((q, i) => (
            <QuickPill
              key={q.label}
              icon={q.icon}
              label={q.label}
              color={q.color}
              bg={q.bg}
              onPress={() => router.push(q.route as any)}
              delay={100 + i * 60}
            />
          ))}
        </ScrollView>

        {/* ── PROMO BANNERS ── */}
        <View style={styles.secRow}>
          <Text style={styles.secTitle}>Today's Deals</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promoRow}
        >
          <PromoBanner
            title="Free Delivery"
            desc="Pehle order pe bilkul free"
            tag="🎉 New User"
            c1="#1A56DB"
            c2="#3B82F6"
            icon="cart-outline"
          />
          <PromoBanner
            title="Bike Ride 10% Off"
            desc="Is weekend special discount"
            tag="🏍️ Weekend"
            c1="#059669"
            c2="#10B981"
            icon="bicycle-outline"
          />
          <PromoBanner
            title="Desi Khana Deal"
            desc="2 order karo, 1 free pao"
            tag="🍽️ Food"
            c1="#D97706"
            c2="#F59E0B"
            icon="restaurant-outline"
          />
        </ScrollView>

        <View style={{ height: Platform.OS === "web" ? 50 : 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* header */
  header: { paddingHorizontal: 16, paddingBottom: 18 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  greeting: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 2 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff", marginBottom: 5 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.75)" },
  cartBubble: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  cartBadge: {
    position: "absolute", top: -5, right: -5,
    backgroundColor: "#F59E0B", borderRadius: 9,
    minWidth: 18, height: 18,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: "#fff",
  },
  cartBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9, color: "#fff" },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 11,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center", justifyContent: "center",
  },
  searchText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: C.textMuted },
  searchFilter: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: "#F8FAFC",
    alignItems: "center", justifyContent: "center",
  },

  /* section */
  secRow: {
    flexDirection: "row", alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: H_PAD, marginTop: 22, marginBottom: 12,
  },
  secTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: C.text },
  secSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },

  /* scroll */
  scroll: { paddingBottom: 16 },

  /* bento */
  bentoGrid: { paddingHorizontal: H_PAD, gap: CARD_GAP },
  halfRow: { flexDirection: "row", gap: CARD_GAP },

  /* hero */
  heroWrapper: { borderRadius: 22, overflow: "hidden" },
  heroCard: {
    borderRadius: 22, padding: 20,
    flexDirection: "row", alignItems: "center",
    minHeight: 160, overflow: "hidden",
  },
  heroLeft: { flex: 1, gap: 6 },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  heroBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff", lineHeight: 30 },
  heroSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 18 },
  heroBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", alignSelf: "flex-start",
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, marginTop: 4,
  },
  heroBtnText: { fontFamily: "Inter_700Bold", fontSize: 12, color: C.primary },
  heroRight: { alignItems: "center", gap: 14, marginLeft: 12 },
  heroIconRing: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.25)",
  },
  heroStats: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, gap: 10,
  },
  heroStat: { alignItems: "center" },
  heroStatNum: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#fff" },
  heroStatLab: { fontFamily: "Inter_400Regular", fontSize: 9, color: "rgba(255,255,255,0.8)" },
  heroStatDiv: { width: 1, height: 20, backgroundColor: "rgba(255,255,255,0.25)" },

  /* half cards */
  halfWrapper: { flex: 1, borderRadius: 18, overflow: "hidden" },
  halfCard: {
    flex: 1, borderRadius: 18, padding: 14,
    overflow: "hidden", gap: 4,
  },
  halfIconBox: { marginBottom: 4 },
  halfIconGrad: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  halfTitle: { fontFamily: "Inter_700Bold", fontSize: 15, lineHeight: 20 },
  halfSub: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 15, flex: 1 },
  halfTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  halfTagText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },

  /* wallet */
  walletWrapper: { borderRadius: 16, overflow: "hidden" },
  walletCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.surface, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1.5, borderColor: "#DBEAFE",
    shadowColor: "#1A56DB", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  walletLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  walletIconCircle: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center",
  },
  walletLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted, marginBottom: 2 },
  walletBal: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.text },
  walletRight: {},
  walletTopUpBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 12,
  },
  walletTopUpText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },

  /* quick pills */
  quickRow: { paddingHorizontal: H_PAD, gap: 10 },
  quickPill: { alignItems: "center", gap: 7, width: 62 },
  quickPillIcon: {
    width: 54, height: 54, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  quickPillLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: C.textSecondary, textAlign: "center" },

  /* promo banners */
  promoRow: { paddingHorizontal: H_PAD, gap: 12 },
  promoBanner: {
    width: width * 0.72, borderRadius: 18,
    padding: 18, flexDirection: "row",
    alignItems: "center", overflow: "hidden",
    minHeight: 110,
  },
  promoTag: {
    backgroundColor: "rgba(255,255,255,0.25)",
    alignSelf: "flex-start",
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, marginBottom: 6,
  },
  promoTagText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#fff" },
  promoTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff", marginBottom: 3 },
  promoDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.88)" },

  /* shared */
  circle: {
    position: "absolute", borderRadius: 999,
    backgroundColor: "#fff",
  },
});
