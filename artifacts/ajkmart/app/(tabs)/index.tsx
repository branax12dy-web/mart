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
const H_PAD = 16;

/* ── animated card wrapper ── */
function Tappable({ children, onPress, style, delay = 0 }: { children: React.ReactNode; onPress: () => void; style?: any; delay?: number }) {
  const scale   = useRef(new Animated.Value(0.93)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, delay, bounciness: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  const onIn  = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start();
  const onOut = () => { Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start(); onPress(); };
  return (
    <Animated.View style={[{ opacity, transform: [{ scale }] }, style]}>
      <Pressable onPressIn={onIn} onPressOut={onOut} style={{ flex: 1 }}>{children}</Pressable>
    </Animated.View>
  );
}

/* ── HERO CARD ── */
function HeroCard({ onPress }: { onPress: () => void }) {
  return (
    <Tappable onPress={onPress} style={styles.heroWrap} delay={80}>
      <LinearGradient colors={["#0D47C0", "#1A56DB", "#2563EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
        <View style={[styles.blob, { width: 200, height: 200, top: -60, right: -40, opacity: 0.12 }]} />
        <View style={[styles.blob, { width: 80,  height: 80,  bottom: 10, right: 80, opacity: 0.1 }]} />

        <View style={styles.heroLeft}>
          <View style={styles.heroBadge}>
            <Ionicons name="storefront" size={11} color="#fff" />
            <Text style={styles.heroBadgeTxt}>Grocery Mart</Text>
          </View>
          <Text style={styles.heroTitle}>AJKMart</Text>
          <Text style={styles.heroSub}>Fresh groceries & daily{"\n"}essentials at your door</Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMeta}><Ionicons name="cube-outline" size={11} color="rgba(255,255,255,0.8)" /><Text style={styles.heroMetaTxt}>500+ items</Text></View>
            <View style={styles.heroMeta}><Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.8)" /><Text style={styles.heroMetaTxt}>20 min delivery</Text></View>
          </View>
          <View style={styles.heroBtn}>
            <Text style={styles.heroBtnTxt}>Shop Now</Text>
            <Ionicons name="arrow-forward" size={13} color={C.primary} />
          </View>
        </View>

        <View style={styles.heroRight}>
          <View style={styles.heroRing}>
            <Ionicons name="storefront" size={44} color="#fff" />
          </View>
        </View>
      </LinearGradient>
    </Tappable>
  );
}

/* ── SERVICE CARD (Food / Ride) ── */
function ServiceCard({ onPress, delay, gradient, iconGrad, icon, title, sub, tag, tagIcon, textColor, tagColor, tagBg }: any) {
  return (
    <Tappable onPress={onPress} style={styles.svcWrap} delay={delay}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.svcCard}>
        <View style={[styles.blob, { width: 110, height: 110, top: -28, right: -28, opacity: 0.13, backgroundColor: "white" }]} />
        <LinearGradient colors={iconGrad} style={styles.svcIconBox}>
          <Ionicons name={icon} size={26} color="#fff" />
        </LinearGradient>
        <Text style={[styles.svcTitle, { color: textColor }]}>{title}</Text>
        <Text style={[styles.svcSub, { color: textColor, opacity: 0.75 }]}>{sub}</Text>
        <View style={[styles.svcTag, { backgroundColor: tagBg }]}>
          <Ionicons name={tagIcon} size={11} color={tagColor} />
          <Text style={[styles.svcTagTxt, { color: tagColor }]}>{tag}</Text>
        </View>
      </LinearGradient>
    </Tappable>
  );
}

/* ── WALLET STRIP ── */
function WalletStrip({ balance, onPress }: { balance: number; onPress: () => void }) {
  return (
    <Tappable onPress={onPress} style={styles.walletWrap} delay={300}>
      <LinearGradient colors={["#0F3BA8", "#1A56DB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.walletCard}>
        <View style={[styles.blob, { width: 130, height: 130, top: -40, right: 40, opacity: 0.1 }]} />
        <View style={styles.walletLeft}>
          <View style={styles.walletIcon}><Ionicons name="wallet" size={22} color="#fff" /></View>
          <View>
            <Text style={styles.walletLbl}>AJKMart Wallet</Text>
            <Text style={styles.walletBal}>Rs. {balance.toLocaleString()}</Text>
          </View>
        </View>
        <Pressable style={styles.walletTopUpBtn} onPress={onPress}>
          <Ionicons name="add" size={15} color={C.primary} />
          <Text style={styles.walletTopUpTxt}>Top Up</Text>
        </Pressable>
      </LinearGradient>
    </Tappable>
  );
}

/* ── QUICK PILL ── */
function QuickPill({ icon, label, color, bg, onPress, delay }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; bg: string; onPress: () => void; delay: number }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 280, delay, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 280, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: op, transform: [{ translateY: ty }] }}>
      <Pressable onPress={onPress} style={styles.pill}>
        <View style={[styles.pillIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={19} color={color} /></View>
        <Text style={styles.pillLbl}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

/* ── DEAL BANNER (full-width stacked cards) ── */
interface DealBannerProps {
  title: string;
  desc: string;
  tag: string;
  emoji: string;
  c1: string;
  c2: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  cta: string;
}
function DealBanner({ title, desc, tag, emoji, c1, c2, icon, route, cta }: DealBannerProps) {
  return (
    <Pressable onPress={() => router.push(route as any)} style={styles.dealWrap}>
      <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dealCard}>
        <View style={[styles.blob, { width: 120, height: 120, top: -30, right: 60, opacity: 0.15 }]} />
        <View style={[styles.blob, { width: 60, height: 60, bottom: -10, right: 20, opacity: 0.12 }]} />

        <View style={{ flex: 1 }}>
          <View style={styles.dealTagRow}>
            <Text style={styles.dealEmoji}>{emoji}</Text>
            <View style={styles.dealTagChip}>
              <Text style={styles.dealTagTxt}>{tag}</Text>
            </View>
          </View>
          <Text style={styles.dealTitle}>{title}</Text>
          <Text style={styles.dealDesc}>{desc}</Text>
          <View style={styles.dealCta}>
            <Text style={styles.dealCtaTxt}>{cta}</Text>
            <Ionicons name="arrow-forward" size={13} color="#fff" />
          </View>
        </View>

        <View style={styles.dealIconBox}>
          <Ionicons name={icon} size={52} color="rgba(255,255,255,0.22)" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/* ══════════════════════════════════════════ MAIN ══════════════════════════════════════════ */
export default function HomeScreen() {
  const insets   = useSafeAreaInsets();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const topPad   = Platform.OS === "web" ? 67 : insets.top;
  const headerOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerOp, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const HALF = (width - H_PAD * 2 - 12) / 2;

  const quickActions = [
    { icon: "leaf-outline"      as const, label: "Fruits",  color: C.mart,      bg: C.martLight,  route: "/mart" },
    { icon: "fish-outline"      as const, label: "Meat",    color: "#EF4444",    bg: "#FEE2E2",    route: "/mart" },
    { icon: "pizza-outline"     as const, label: "Pizza",   color: C.food,       bg: C.foodLight,  route: "/food" },
    { icon: "bicycle-outline"   as const, label: "Bike",    color: "#8B5CF6",    bg: "#EDE9FE",    route: "/ride" },
    { icon: "cafe-outline"      as const, label: "Drinks",  color: "#0891B2",    bg: "#E0F2FE",    route: "/mart" },
    { icon: "flash-outline"     as const, label: "Deals",   color: "#DC2626",    bg: "#FEE2E2",    route: "/mart" },
    { icon: "time-outline"      as const, label: "Track",   color: C.primary,    bg: C.rideLight,  route: "/(tabs)/orders" },
    { icon: "car-outline"       as const, label: "Car",     color: "#059669",    bg: "#D1FAE5",    route: "/ride" },
  ];

  const deals: DealBannerProps[] = [
    {
      title: "Free Delivery",
      desc:  "Apnay pehle order pe delivery bilkul free — ajj hi try karein!",
      tag:   "Naye Users",
      emoji: "🎉",
      c1:    "#1A56DB", c2: "#2563EB",
      icon:  "cart-outline",
      route: "/mart",
      cta:   "Shop Karo",
    },
    {
      title: "Bike Ride 10% Off",
      desc:  "Is hafte sirf Rs. 45 se bike book karein — AJK mein kahin bhi!",
      tag:   "Weekend Special",
      emoji: "🏍️",
      c1:    "#059669", c2: "#10B981",
      icon:  "bicycle-outline",
      route: "/ride",
      cta:   "Ride Book Karo",
    },
    {
      title: "Desi Khana Deal",
      desc:  "2 food orders karo, agla order 20% off pao — limited time!",
      tag:   "Food Deal",
      emoji: "🍽️",
      c1:    "#D97706", c2: "#F59E0B",
      icon:  "restaurant-outline",
      route: "/food",
      cta:   "Order Karo",
    },
    {
      title: "Flash Deals — Groceries",
      desc:  "Roz nayi deals — fruits, sabziyan, doodh sab pe 15–20% bachao!",
      tag:   "⚡ Flash Sale",
      emoji: "🛒",
      c1:    "#7C3AED", c2: "#8B5CF6",
      icon:  "flash-outline",
      route: "/mart",
      cta:   "Deals Dekho",
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      {/* HEADER */}
      <Animated.View style={{ opacity: headerOp }}>
        <LinearGradient
          colors={["#0F3BA8", C.primary, "#2563EB"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: topPad + 14 }]}
        >
          <View style={styles.hdrRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{user?.name ? `Salam, ${user.name.split(" ")[0]} 👋` : "Salam! 👋"}</Text>
              <Text style={styles.hdrTitle}>Kya chahiye aaj?</Text>
              <View style={styles.locRow}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.75)" />
                <Text style={styles.locTxt}>AJK, Pakistan</Text>
              </View>
            </View>
            <Pressable onPress={() => router.push("/cart")} style={styles.cartBubble}>
              <Ionicons name="bag-outline" size={22} color="#fff" />
              {itemCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeTxt}>{itemCount > 9 ? "9+" : itemCount}</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Search */}
          <Pressable onPress={() => router.push("/mart")} style={styles.searchBar}>
            <View style={styles.searchIcon}><Ionicons name="search" size={16} color={C.primary} /></View>
            <Text style={styles.searchTxt}>Products, food, restaurants...</Text>
            <View style={styles.searchFilter}><Ionicons name="options-outline" size={16} color={C.textMuted} /></View>
          </Pressable>
        </LinearGradient>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* SERVICES SECTION LABEL */}
        <View style={styles.secRow}>
          <Text style={styles.secTitle}>Our Services</Text>
          <Text style={styles.secSub}>Sab kuch ek jagah</Text>
        </View>

        {/* BENTO GRID */}
        <View style={styles.grid}>
          {/* Hero */}
          <HeroCard onPress={() => router.push("/mart")} />

          {/* Food + Ride side by side */}
          <View style={styles.halfRow}>
            <ServiceCard
              onPress={() => router.push("/food")}
              delay={160}
              gradient={["#FFFBEB", "#FEF3C7"]}
              iconGrad={["#F59E0B", "#FBBF24"]}
              icon="restaurant"
              title={"Food\nDelivery"}
              sub={"Restaurants\nnear you"}
              tag="30 min"
              tagIcon="time-outline"
              textColor="#92400E"
              tagColor="#92400E"
              tagBg="#FDE68A"
            />
            <ServiceCard
              onPress={() => router.push("/ride")}
              delay={240}
              gradient={["#F0FDF4", "#DCFCE7"]}
              iconGrad={["#10B981", "#34D399"]}
              icon="car"
              title={"Bike &\nCar Ride"}
              sub={"Safe & fast\nbooking"}
              tag="Instant"
              tagIcon="flash-outline"
              textColor="#065F46"
              tagColor="#065F46"
              tagBg="#A7F3D0"
            />
          </View>

          {/* Wallet */}
          <WalletStrip balance={user?.walletBalance || 0} onPress={() => router.push("/(tabs)/wallet")} />
        </View>

        {/* QUICK PILLS */}
        <View style={styles.secRow}>
          <Text style={styles.secTitle}>Quick Access</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
          {quickActions.map((q, i) => (
            <QuickPill
              key={q.label}
              icon={q.icon}
              label={q.label}
              color={q.color}
              bg={q.bg}
              onPress={() => router.push(q.route as any)}
              delay={80 + i * 55}
            />
          ))}
        </ScrollView>

        {/* DEALS SECTION */}
        <View style={styles.secRow}>
          <Text style={styles.secTitle}>Today's Deals</Text>
          <Text style={styles.secSub}>Limited time offers</Text>
        </View>
        <View style={styles.dealsCol}>
          {deals.map((d, i) => (
            <DealBanner key={i} {...d} />
          ))}
        </View>

        <View style={{ height: Platform.OS === "web" ? 50 : 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* header */
  header: { paddingHorizontal: H_PAD, paddingBottom: 18 },
  hdrRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  greeting: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 2 },
  hdrTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff", marginBottom: 5 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locTxt: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.75)" },
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
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: "#fff",
  },
  cartBadgeTxt: { fontFamily: "Inter_700Bold", fontSize: 9, color: "#fff" },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 11,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  searchIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  searchTxt: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: C.textMuted },
  searchFilter: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },

  /* section */
  secRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: H_PAD, marginTop: 22, marginBottom: 12 },
  secTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: C.text },
  secSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },

  scroll: { paddingBottom: 16 },

  /* bento grid */
  grid: { paddingHorizontal: H_PAD, gap: 12 },
  halfRow: { flexDirection: "row", gap: 12 },

  /* hero */
  heroWrap: { borderRadius: 22, overflow: "hidden" },
  heroCard: { borderRadius: 22, padding: 20, flexDirection: "row", alignItems: "center", minHeight: 165, overflow: "hidden" },
  heroLeft: { flex: 1, gap: 7 },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  heroBadgeTxt: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 28, color: "#fff", lineHeight: 32 },
  heroSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 17 },
  heroMetaRow: { flexDirection: "row", gap: 12, marginTop: 2 },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroMetaTxt: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.8)" },
  heroBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginTop: 2 },
  heroBtnTxt: { fontFamily: "Inter_700Bold", fontSize: 12, color: C.primary },
  heroRight: { alignItems: "center", marginLeft: 12 },
  heroRing: { width: 76, height: 76, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.25)" },

  /* service cards */
  svcWrap: { flex: 1, borderRadius: 18, overflow: "hidden" },
  svcCard: { flex: 1, borderRadius: 18, padding: 16, minHeight: 175, overflow: "hidden", gap: 5 },
  svcIconBox: { width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  svcTitle: { fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 21 },
  svcSub: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 15, flex: 1 },
  svcTag: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  svcTagTxt: { fontFamily: "Inter_600SemiBold", fontSize: 10 },

  /* wallet strip */
  walletWrap: { borderRadius: 16, overflow: "hidden" },
  walletCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, overflow: "hidden" },
  walletLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  walletIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  walletLbl: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.8)", marginBottom: 2 },
  walletBal: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff" },
  walletTopUpBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  walletTopUpTxt: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: C.primary },

  /* quick pills */
  pillsRow: { paddingHorizontal: H_PAD, gap: 10 },
  pill: { alignItems: "center", gap: 7, width: 64 },
  pillIcon: { width: 56, height: 56, borderRadius: 17, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  pillLbl: { fontFamily: "Inter_500Medium", fontSize: 11, color: C.textSecondary, textAlign: "center" },

  /* deal banners (stacked vertical) */
  dealsCol: { paddingHorizontal: H_PAD, gap: 12 },
  dealWrap: { borderRadius: 20, overflow: "hidden" },
  dealCard: {
    borderRadius: 20, padding: 20, minHeight: 120,
    flexDirection: "row", alignItems: "center",
    overflow: "hidden",
  },
  dealTagRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  dealEmoji: { fontSize: 16 },
  dealTagChip: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  dealTagTxt: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#fff" },
  dealTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff", marginBottom: 4 },
  dealDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.88)", lineHeight: 17, marginBottom: 10, flex: 1 },
  dealCta: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.22)", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  dealCtaTxt: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
  dealIconBox: { marginLeft: 12, opacity: 0.9 },

  /* shared */
  blob: { position: "absolute", borderRadius: 999, backgroundColor: "#fff" },
});
