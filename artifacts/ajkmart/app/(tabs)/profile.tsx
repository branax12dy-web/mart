import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
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

const C = Colors.light;

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  iconColor?: string;
  iconBg?: string;
  danger?: boolean;
}

function MenuItem({ icon, label, onPress, iconColor = C.primary, iconBg = C.rideLight, danger }: MenuItemProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
      <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: C.danger }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const roleLabel: Record<string, string> = {
    customer: "Customer",
    rider: "Delivery Rider",
    vendor: "Store Vendor",
  };
  const roleColor: Record<string, string> = {
    customer: C.primary,
    rider: C.success,
    vendor: C.food,
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[C.primaryDark, C.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : user?.phone?.slice(-2) || "U"}
            </Text>
          </View>
          <Text style={styles.profileName}>{user?.name || "AJKMart User"}</Text>
          <Text style={styles.profilePhone}>{user?.phone || ""}</Text>
          <View style={[styles.roleBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Text style={styles.roleText}>{roleLabel[user?.role || "customer"] || "Customer"}</Text>
          </View>
        </LinearGradient>

        <View style={styles.walletBanner}>
          <View>
            <Text style={styles.walletLabel}>Wallet Balance</Text>
            <Text style={styles.walletBal}>Rs. {(user?.walletBalance || 0).toLocaleString()}</Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/wallet")} style={styles.walletBtn}>
            <Text style={styles.walletBtnText}>Manage</Text>
            <Ionicons name="arrow-forward" size={16} color={C.primary} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <MenuItem icon="person-outline" label="Edit Profile" onPress={() => {}} iconColor={C.primary} iconBg={C.rideLight} />
          <MenuItem icon="location-outline" label="Saved Addresses" onPress={() => {}} iconColor={C.mart} iconBg={C.martLight} />
          <MenuItem icon="notifications-outline" label="Notifications" onPress={() => {}} iconColor={C.food} iconBg={C.foodLight} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <MenuItem icon="bag-outline" label="My Orders" onPress={() => router.push("/(tabs)/orders")} iconColor={C.primary} iconBg={C.rideLight} />
          <MenuItem icon="car-outline" label="My Rides" onPress={() => {}} iconColor="#8B5CF6" iconBg="#EDE9FE" />
          <MenuItem icon="wallet-outline" label="Wallet & Payments" onPress={() => router.push("/(tabs)/wallet")} iconColor={C.wallet} iconBg={C.walletLight} />
        </View>

        {(user?.role === "vendor") && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vendor Dashboard</Text>
            <MenuItem icon="storefront-outline" label="Manage Products" onPress={() => {}} iconColor={C.mart} iconBg={C.martLight} />
            <MenuItem icon="analytics-outline" label="Sales Analytics" onPress={() => {}} iconColor={C.primary} iconBg={C.rideLight} />
          </View>
        )}

        {(user?.role === "rider") && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rider Dashboard</Text>
            <MenuItem icon="bicycle-outline" label="Active Deliveries" onPress={() => {}} iconColor={C.success} iconBg={C.martLight} />
            <MenuItem icon="cash-outline" label="My Earnings" onPress={() => {}} iconColor={C.food} iconBg={C.foodLight} />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <MenuItem icon="help-circle-outline" label="Help & FAQ" onPress={() => {}} iconColor="#64748B" iconBg="#F1F5F9" />
          <MenuItem icon="shield-outline" label="Privacy Policy" onPress={() => {}} iconColor="#64748B" iconBg="#F1F5F9" />
          <MenuItem icon="document-text-outline" label="Terms of Service" onPress={() => {}} iconColor="#64748B" iconBg="#F1F5F9" />
        </View>

        <View style={[styles.section, { marginBottom: 20 }]}>
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={C.danger} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </Pressable>
        </View>

        <View style={{ height: Platform.OS === "web" ? 34 : 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: C.text },
  profileCard: { margin: 16, borderRadius: 20, padding: 24, alignItems: "center" },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 28, color: "#fff" },
  profileName: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff", marginBottom: 4 },
  profilePhone: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 10 },
  roleBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  roleText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  walletBanner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.surface, marginHorizontal: 16, marginBottom: 8, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  walletLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted, marginBottom: 2 },
  walletBal: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.text },
  walletBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.rideLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  walletBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: C.primary },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: C.textMuted, marginBottom: 10, marginTop: 16, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  menuItemPressed: { opacity: 0.7 },
  menuIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: C.text },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, backgroundColor: "#FEE2E2", borderRadius: 14 },
  logoutText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.danger },
});
