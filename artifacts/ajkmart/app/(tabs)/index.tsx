import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  ImageBackground,
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

interface ServiceCardProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  onPress: () => void;
  delay: number;
}

function ServiceCard({ title, subtitle, icon, color, bgColor, onPress, delay }: ServiceCardProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    onPress();
  };

  return (
    <Animated.View style={[{ opacity, transform: [{ scale }] }, styles.serviceCardWrapper]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.serviceCardPress}>
        <View style={[styles.serviceCard, { backgroundColor: C.surface }]}>
          <View style={[styles.serviceIconBox, { backgroundColor: bgColor }]}>
            <Ionicons name={icon} size={32} color={color} />
          </View>
          <Text style={styles.serviceTitle}>{title}</Text>
          <Text style={styles.serviceSubtitle}>{subtitle}</Text>
          <View style={styles.serviceArrow}>
            <Ionicons name="arrow-forward" size={14} color={color} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function PromoCard({ title, desc, color1, color2, icon }: { title: string; desc: string; color1: string; color2: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <LinearGradient colors={[color1, color2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.promoCard}>
      <View style={styles.promoContent}>
        <Text style={styles.promoTitle}>{title}</Text>
        <Text style={styles.promoDesc}>{desc}</Text>
        <Pressable style={styles.promoBtn}>
          <Text style={styles.promoBtnText}>Order Now</Text>
        </Pressable>
      </View>
      <Ionicons name={icon} size={64} color="rgba(255,255,255,0.2)" style={styles.promoBgIcon} />
    </LinearGradient>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const services = [
    {
      title: "AJKMart",
      subtitle: "Groceries & more",
      icon: "storefront-outline" as const,
      color: C.mart,
      bgColor: C.martLight,
      route: "/mart",
      delay: 100,
    },
    {
      title: "Food",
      subtitle: "Restaurants near you",
      icon: "restaurant-outline" as const,
      color: C.food,
      bgColor: C.foodLight,
      route: "/food",
      delay: 200,
    },
    {
      title: "Ride",
      subtitle: "Car & bike booking",
      icon: "car-outline" as const,
      color: C.ride,
      bgColor: C.rideLight,
      route: "/ride",
      delay: 300,
    },
    {
      title: "Wallet",
      subtitle: "Manage your money",
      icon: "wallet-outline" as const,
      color: C.wallet,
      bgColor: C.walletLight,
      route: "/(tabs)/wallet",
      delay: 400,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <Animated.View style={[styles.header, { paddingTop: topPad + 12, opacity: headerAnim }]}>
        <LinearGradient
          colors={[C.primaryDark, C.primary, C.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerGreeting}>
              {user?.name ? `Hello, ${user.name.split(" ")[0]}` : "Hello there"}
            </Text>
            <Text style={styles.headerTitle}>What can we help you with?</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.locationText}>AJK, Pakistan</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={() => router.push("/cart")} style={styles.cartBtn}>
              <Ionicons name="bag-outline" size={22} color="#fff" />
              {itemCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{itemCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={C.textMuted} />
          <Text style={styles.searchPlaceholder}>Search products, food, rides...</Text>
        </View>
      </Animated.View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionTitle}>Our Services</Text>
        <View style={styles.servicesGrid}>
          {services.map(s => (
            <ServiceCard
              key={s.title}
              title={s.title}
              subtitle={s.subtitle}
              icon={s.icon}
              color={s.color}
              bgColor={s.bgColor}
              delay={s.delay}
              onPress={() => router.push(s.route as any)}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Today's Deals</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promoScroll}>
          <PromoCard title="Free Delivery" desc="On first grocery order" color1="#1A56DB" color2="#3B82F6" icon="cart-outline" />
          <PromoCard title="Bike Rides" desc="10% off this weekend" color1="#10B981" color2="#34D399" icon="bicycle-outline" />
          <PromoCard title="Desi Food" desc="Order 2 get 1 free" color1="#F59E0B" color2="#FBBF24" icon="restaurant-outline" />
        </ScrollView>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <Pressable onPress={() => router.push("/mart")} style={styles.quickAction}>
            <View style={[styles.quickIcon, { backgroundColor: C.martLight }]}>
              <Ionicons name="leaf-outline" size={20} color={C.mart} />
            </View>
            <Text style={styles.quickLabel}>Fruits</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/mart")} style={styles.quickAction}>
            <View style={[styles.quickIcon, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="fish-outline" size={20} color="#EF4444" />
            </View>
            <Text style={styles.quickLabel}>Meat</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/food")} style={styles.quickAction}>
            <View style={[styles.quickIcon, { backgroundColor: C.foodLight }]}>
              <Ionicons name="pizza-outline" size={20} color={C.food} />
            </View>
            <Text style={styles.quickLabel}>Pizza</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/ride")} style={styles.quickAction}>
            <View style={[styles.quickIcon, { backgroundColor: "#F3E8FF" }]}>
              <Ionicons name="bicycle-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.quickLabel}>Bike</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/(tabs)/orders")} style={styles.quickAction}>
            <View style={[styles.quickIcon, { backgroundColor: "#E0F2FE" }]}>
              <Ionicons name="time-outline" size={20} color="#0284C7" />
            </View>
            <Text style={styles.quickLabel}>Track</Text>
          </Pressable>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    overflow: "hidden",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerLeft: { flex: 1 },
  headerRight: {},
  headerGreeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#fff",
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  cartBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: C.accent,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "#fff",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  searchPlaceholder: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: C.textMuted,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: C.text,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 14,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 12,
  },
  serviceCardWrapper: {
    width: (width - 40) / 2,
    marginHorizontal: 4,
  },
  serviceCardPress: { flex: 1 },
  serviceCard: {
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceIconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  serviceTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: C.text,
    marginBottom: 4,
  },
  serviceSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: C.textSecondary,
    marginBottom: 12,
  },
  serviceArrow: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: C.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  promoScroll: { paddingLeft: 20 },
  promoCard: {
    width: width * 0.7,
    borderRadius: 18,
    padding: 20,
    marginRight: 12,
    overflow: "hidden",
    minHeight: 130,
  },
  promoContent: { flex: 1, zIndex: 1 },
  promoTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#fff",
    marginBottom: 4,
  },
  promoDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 14,
  },
  promoBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  promoBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#fff",
  },
  promoBgIcon: {
    position: "absolute",
    right: -8,
    top: 10,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    justifyContent: "space-between",
  },
  quickAction: { alignItems: "center", gap: 8 },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: C.textSecondary,
  },
  bottomPad: { height: 20 },
});
