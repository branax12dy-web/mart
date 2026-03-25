import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "@workspace/api-client-react";

const C = Colors.light;

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  iconColor?: string;
  iconBg?: string;
  value?: string;
  danger?: boolean;
  badge?: string;
}

function MenuItem({ icon, label, onPress, iconColor = C.primary, iconBg = C.rideLight, value, danger, badge }: MenuItemProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}>
      <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={19} color={iconColor} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: C.danger }]}>{label}</Text>
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
      {badge ? (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      ) : null}
      {!danger && <Ionicons name="chevron-forward" size={17} color={C.textMuted} />}
    </Pressable>
  );
}

function EditProfileModal({
  visible,
  onClose,
  currentName,
  currentEmail,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  currentName: string;
  currentEmail: string;
  onSaved: (name: string, email: string) => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter your name");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ userId: user!.id, name: name.trim(), email: email.trim() });
      onSaved(name.trim(), email.trim());
      onClose();
      Alert.alert("✅ Profile Updated", "Your profile has been saved successfully.");
    } catch {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    }
    setSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Edit Profile</Text>

          <Text style={styles.fieldLabel}>Full Name</Text>
          <View style={styles.fieldWrap}>
            <Ionicons name="person-outline" size={18} color={C.textMuted} />
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor={C.textMuted}
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.fieldLabel}>Email Address</Text>
          <View style={styles.fieldWrap}>
            <Ionicons name="mail-outline" size={18} color={C.textMuted} />
            <TextInput
              style={styles.fieldInput}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={C.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.sheetBtns}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.7 }]}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [showEdit, setShowEdit] = useState(false);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const handleSavedProfile = (name: string, email: string) => {
    updateUser({ name, email });
  };

  const roleLabel: Record<string, string> = {
    customer: "Customer",
    rider: "Delivery Rider",
    vendor: "Store Vendor",
  };
  const roleColors: Record<string, [string, string]> = {
    customer: ["#1A56DB", "#3B82F6"],
    rider:    ["#059669", "#10B981"],
    vendor:   ["#D97706", "#F59E0B"],
  };
  const [c1, c2] = roleColors[user?.role || "customer"] || roleColors.customer;

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : user?.phone?.slice(-2) || "U";

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <LinearGradient
          colors={[c1, c2]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.profileCard, { paddingTop: topPad + 20 }]}
        >
          <View style={styles.avatarRing}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{user?.name || "AJKMart User"}</Text>
          <Text style={styles.profilePhone}>{user?.phone ? `+92 ${user.phone}` : ""}</Text>
          {user?.email ? <Text style={styles.profileEmail}>{user.email}</Text> : null}
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{roleLabel[user?.role || "customer"]}</Text>
          </View>
          <Pressable onPress={() => setShowEdit(true)} style={styles.editProfileBtn}>
            <Ionicons name="pencil-outline" size={15} color={c1} />
            <Text style={[styles.editProfileText, { color: c1 }]}>Edit Profile</Text>
          </Pressable>
        </LinearGradient>

        {/* Wallet Banner */}
        <Pressable onPress={() => router.push("/(tabs)/wallet")} style={styles.walletBanner}>
          <View style={styles.walletLeft}>
            <View style={styles.walletIconBox}>
              <Ionicons name="wallet-outline" size={22} color={C.primary} />
            </View>
            <View>
              <Text style={styles.walletBannerLabel}>Wallet Balance</Text>
              <Text style={styles.walletBannerAmt}>Rs. {(user?.walletBalance || 0).toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.walletManageBtn}>
            <Text style={styles.walletManageText}>Manage</Text>
            <Ionicons name="arrow-forward" size={15} color={C.primary} />
          </View>
        </Pressable>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <MenuItem
            icon="person-outline"
            label="Edit Profile"
            iconColor={C.primary}
            iconBg={C.rideLight}
            onPress={() => setShowEdit(true)}
          />
          <MenuItem
            icon="call-outline"
            label="Phone Number"
            iconColor="#7C3AED"
            iconBg="#EDE9FE"
            value={user?.phone ? `+92 ${user.phone}` : "—"}
            onPress={() => {}}
          />
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            iconColor={C.food}
            iconBg={C.foodLight}
            badge="3"
            onPress={() => Alert.alert("Notifications", "• Your order is confirmed\n• Wallet top-up successful\n• New deals available")}
          />
        </View>

        {/* Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Activity</Text>
          <MenuItem
            icon="bag-outline"
            label="My Orders"
            iconColor={C.primary}
            iconBg={C.rideLight}
            onPress={() => router.push("/(tabs)/orders")}
          />
          <MenuItem
            icon="car-outline"
            label="My Rides"
            iconColor="#8B5CF6"
            iconBg="#EDE9FE"
            onPress={() => Alert.alert("My Rides", "Ride history coming soon!")}
          />
          <MenuItem
            icon="wallet-outline"
            label="Wallet & Payments"
            iconColor={C.primary}
            iconBg="#EFF6FF"
            onPress={() => router.push("/(tabs)/wallet")}
          />
          <MenuItem
            icon="location-outline"
            label="Saved Addresses"
            iconColor={C.mart}
            iconBg={C.martLight}
            onPress={() => Alert.alert("Saved Addresses", "Address management coming soon!")}
          />
        </View>

        {/* Vendor Dashboard */}
        {user?.role === "vendor" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vendor Dashboard</Text>
            <MenuItem
              icon="storefront-outline"
              label="My Products"
              iconColor={C.mart}
              iconBg={C.martLight}
              onPress={() => Alert.alert("Vendor", "Product management coming soon!")}
            />
            <MenuItem
              icon="analytics-outline"
              label="Sales Analytics"
              iconColor={C.primary}
              iconBg={C.rideLight}
              onPress={() => Alert.alert("Vendor", "Analytics coming soon!")}
            />
            <MenuItem
              icon="receipt-outline"
              label="Incoming Orders"
              iconColor={C.food}
              iconBg={C.foodLight}
              onPress={() => Alert.alert("Vendor", "Order management coming soon!")}
            />
          </View>
        )}

        {/* Rider Dashboard */}
        {user?.role === "rider" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rider Dashboard</Text>
            <MenuItem
              icon="bicycle-outline"
              label="Active Deliveries"
              iconColor={C.success}
              iconBg="#D1FAE5"
              onPress={() => Alert.alert("Rider", "Active deliveries coming soon!")}
            />
            <MenuItem
              icon="cash-outline"
              label="My Earnings"
              iconColor={C.food}
              iconBg={C.foodLight}
              onPress={() => Alert.alert("Rider", "Earnings tracking coming soon!")}
            />
          </View>
        )}

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <MenuItem
            icon="help-circle-outline"
            label="Help & FAQ"
            iconColor="#64748B"
            iconBg="#F1F5F9"
            onPress={() => Alert.alert("Help", "For support contact us at:\nhelp@ajkmart.pk\n+92 300 AJKMART")}
          />
          <MenuItem
            icon="shield-outline"
            label="Privacy Policy"
            iconColor="#64748B"
            iconBg="#F1F5F9"
            onPress={() => Alert.alert("Privacy", "Your data is secure and never sold to third parties.")}
          />
          <MenuItem
            icon="document-text-outline"
            label="Terms of Service"
            iconColor="#64748B"
            iconBg="#F1F5F9"
            onPress={() => Alert.alert("Terms", "By using AJKMart you agree to our terms of service.")}
          />
        </View>

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>AJKMart v1.0.0</Text>
          <Text style={styles.appTagline}>Your Super App for AJK</Text>
        </View>

        {/* Logout */}
        <View style={{ paddingHorizontal: 16, marginBottom: 30 }}>
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={C.danger} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </Pressable>
        </View>

        <View style={{ height: Platform.OS === "web" ? 50 : 20 }} />
      </ScrollView>

      <EditProfileModal
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        currentName={user?.name || ""}
        currentEmail={user?.email || ""}
        onSaved={handleSavedProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: { paddingHorizontal: 20, paddingBottom: 28, alignItems: "center", overflow: "hidden" },
  avatarRing: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 12, borderWidth: 2, borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 30, color: "#fff" },
  profileName: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff", marginBottom: 4 },
  profilePhone: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.85)" },
  profileEmail: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  roleBadge: {
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, marginTop: 10,
  },
  roleText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  editProfileBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, marginTop: 14,
  },
  editProfileText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  walletBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.surface, marginHorizontal: 16, marginTop: 16,
    borderRadius: 18, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    borderWidth: 1.5, borderColor: "#DBEAFE",
  },
  walletLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  walletIconBox: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center",
  },
  walletBannerLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted, marginBottom: 2 },
  walletBannerAmt: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.text },
  walletManageBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: C.rideLight, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
  },
  walletManageText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: C.primary },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: {
    fontFamily: "Inter_700Bold", fontSize: 12, color: C.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  menuIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: C.text },
  menuValue: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.textMuted, marginRight: 4 },
  menuBadge: {
    backgroundColor: "#EF4444", borderRadius: 10,
    minWidth: 20, height: 20, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 5, marginRight: 4,
  },
  menuBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#fff" },
  appInfo: { alignItems: "center", marginTop: 24, marginBottom: 8, gap: 4 },
  appVersion: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.textMuted },
  appTagline: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.border },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 15,
    backgroundColor: "#FEE2E2", borderRadius: 16,
  },
  logoutText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.danger },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: Platform.OS === "web" ? 40 : 48, paddingTop: 12,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.text, marginBottom: 24 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.textSecondary, marginBottom: 8 },
  fieldWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 14, paddingHorizontal: 14,
    marginBottom: 16, backgroundColor: C.surface,
  },
  fieldInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: C.text, paddingVertical: 13 },
  sheetBtns: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 14, paddingVertical: 14, alignItems: "center",
  },
  cancelBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.textSecondary },
  saveBtn: { flex: 2, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
});
