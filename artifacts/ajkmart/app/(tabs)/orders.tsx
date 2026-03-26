import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useGetOrders } from "@workspace/api-client-react";

const C = Colors.light;

/* ─────────────────────────── Status config ─────────────────────────── */
const ORDER_STATUS: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  pending:          { color: "#D97706", bg: "#FEF3C7", icon: "time-outline",            label: "Pending" },
  confirmed:        { color: "#2563EB", bg: "#DBEAFE", icon: "checkmark-circle-outline", label: "Confirmed" },
  preparing:        { color: "#7C3AED", bg: "#EDE9FE", icon: "flame-outline",            label: "Preparing" },
  out_for_delivery: { color: "#059669", bg: "#D1FAE5", icon: "bicycle-outline",          label: "On the Way" },
  delivered:        { color: "#6B7280", bg: "#F3F4F6", icon: "checkmark-done-outline",   label: "Delivered" },
  cancelled:        { color: "#DC2626", bg: "#FEE2E2", icon: "close-circle-outline",     label: "Cancelled" },
};

const RIDE_STATUS: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  searching:  { color: "#D97706", bg: "#FEF3C7", icon: "search-outline",            label: "Finding Rider" },
  accepted:   { color: "#2563EB", bg: "#DBEAFE", icon: "person-outline",            label: "Rider Accepted" },
  arrived:    { color: "#7C3AED", bg: "#EDE9FE", icon: "location-outline",          label: "Rider Arrived" },
  in_transit: { color: "#059669", bg: "#D1FAE5", icon: "car-outline",               label: "In Transit" },
  completed:  { color: "#6B7280", bg: "#F3F4F6", icon: "checkmark-done-outline",    label: "Completed" },
  cancelled:  { color: "#DC2626", bg: "#FEE2E2", icon: "close-circle-outline",      label: "Cancelled" },
};

/* ─────────────────────────── Tab config ─────────────────────────── */
const TABS = [
  { key: "all",      label: "All",       icon: "layers-outline" },
  { key: "mart",     label: "Mart",      icon: "storefront-outline" },
  { key: "food",     label: "Food",      icon: "restaurant-outline" },
  { key: "rides",    label: "Rides",     icon: "car-outline" },
  { key: "pharmacy", label: "Pharmacy",  icon: "medical-outline" },
  { key: "parcel",   label: "Parcel",    icon: "cube-outline" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ─────────────────────────── Grocery/Food Card ─────────────────────────── */
function OrderCard({ order }: { order: any }) {
  const cfg = ORDER_STATUS[order.status] || ORDER_STATUS["pending"]!;
  const isFood = order.type === "food";

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.chip, { backgroundColor: isFood ? "#FFF3E0" : "#E3F2FD" }]}>
          <Ionicons
            name={isFood ? "restaurant-outline" : "storefront-outline"}
            size={13}
            color={isFood ? "#E65100" : "#0D47A1"}
          />
          <Text style={[styles.chipText, { color: isFood ? "#E65100" : "#0D47A1" }]}>
            {isFood ? "Food" : "Mart"}
          </Text>
        </View>
        <Text style={styles.cardId}>#{order.id.slice(-8).toUpperCase()}</Text>
      </View>

      <View style={styles.cardItems}>
        {(order.items || []).slice(0, 2).map((item: any, i: number) => (
          <View key={i} style={styles.itemRow}>
            <View style={styles.itemDot} />
            <Text style={styles.itemText} numberOfLines={1}>{item.quantity}× {item.name}</Text>
            <Text style={styles.itemPrice}>Rs. {item.price * item.quantity}</Text>
          </View>
        ))}
        {(order.items || []).length > 2 && (
          <Text style={styles.moreItems}>+{order.items.length - 2} more items</Text>
        )}
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>Rs. {order.total?.toLocaleString()}</Text>
        </View>
      </View>

      {order.estimatedTime && !["delivered", "cancelled"].includes(order.status) && (
        <View style={styles.etaBar}>
          <Ionicons name="time-outline" size={12} color={C.primary} />
          <Text style={styles.etaText}>ETA: {order.estimatedTime}</Text>
          <View style={styles.payBadge}>
            <Ionicons
              name={order.paymentMethod === "wallet" ? "wallet-outline" : "cash-outline"}
              size={11} color={C.textMuted}
            />
            <Text style={styles.payText}>{order.paymentMethod === "wallet" ? "Wallet" : "Cash"}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

/* ─────────────────────────── Ride Card ─────────────────────────── */
function RideCard({ ride }: { ride: any }) {
  const cfg = RIDE_STATUS[ride.status] || RIDE_STATUS["searching"]!;
  const isActive = !["completed", "cancelled"].includes(ride.status);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.chip, { backgroundColor: "#E8F5E9" }]}>
          <Ionicons
            name={ride.type === "bike" ? "bicycle-outline" : "car-outline"}
            size={13} color="#1B5E20"
          />
          <Text style={[styles.chipText, { color: "#1B5E20" }]}>
            {ride.type === "bike" ? "Bike Ride" : "Car Ride"}
          </Text>
        </View>
        <Text style={styles.cardId}>#{ride.id.slice(-8).toUpperCase()}</Text>
      </View>

      <View style={styles.rideRoute}>
        <View style={styles.ridePoint}>
          <View style={[styles.routeDot, { backgroundColor: "#10B981" }]} />
          <Text style={styles.rideAddr} numberOfLines={1}>{ride.pickupAddress || "Pickup Location"}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.ridePoint}>
          <View style={[styles.routeDot, { backgroundColor: "#EF4444" }]} />
          <Text style={styles.rideAddr} numberOfLines={1}>{ride.dropAddress || "Drop Location"}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>{ride.distance ? `${ride.distance} km` : "Fare"}</Text>
          <Text style={styles.totalAmount}>Rs. {ride.fare?.toLocaleString()}</Text>
        </View>
      </View>

      {isActive && (
        <View style={styles.etaBar}>
          <Ionicons name="navigate-outline" size={12} color={C.primary} />
          <Text style={styles.etaText}>
            {ride.paymentMethod === "wallet" ? "Paid via Wallet" : "Cash Payment"}
          </Text>
        </View>
      )}
    </View>
  );
}

/* ─────────────────────────── Pharmacy Card ─────────────────────────── */
function PharmacyCard({ order }: { order: any }) {
  const cfg = ORDER_STATUS[order.status] || ORDER_STATUS["pending"]!;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.chip, { backgroundColor: "#FCE4EC" }]}>
          <Ionicons name="medical-outline" size={13} color="#880E4F" />
          <Text style={[styles.chipText, { color: "#880E4F" }]}>Pharmacy</Text>
        </View>
        <Text style={styles.cardId}>#{order.id.slice(-8).toUpperCase()}</Text>
      </View>

      {order.prescriptionNote && (
        <View style={styles.noteRow}>
          <Ionicons name="document-text-outline" size={14} color={C.textMuted} />
          <Text style={styles.noteText} numberOfLines={2}>{order.prescriptionNote}</Text>
        </View>
      )}

      <View style={styles.cardItems}>
        {(order.items || []).slice(0, 2).map((item: any, i: number) => (
          <View key={i} style={styles.itemRow}>
            <View style={styles.itemDot} />
            <Text style={styles.itemText} numberOfLines={1}>{item.quantity}× {item.name}</Text>
            <Text style={styles.itemPrice}>Rs. {item.price * item.quantity}</Text>
          </View>
        ))}
        {(order.items || []).length > 2 && (
          <Text style={styles.moreItems}>+{order.items.length - 2} more items</Text>
        )}
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>Rs. {order.total?.toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );
}

/* ─────────────────────────── Parcel Card ─────────────────────────── */
function ParcelCard({ booking }: { booking: any }) {
  const cfg = RIDE_STATUS[booking.status] || RIDE_STATUS["searching"]!;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.chip, { backgroundColor: "#FFF8E1" }]}>
          <Ionicons name="cube-outline" size={13} color="#E65100" />
          <Text style={[styles.chipText, { color: "#E65100" }]}>Parcel</Text>
        </View>
        <Text style={styles.cardId}>#{booking.id.slice(-8).toUpperCase()}</Text>
      </View>

      <View style={styles.rideRoute}>
        <View style={styles.ridePoint}>
          <View style={[styles.routeDot, { backgroundColor: "#10B981" }]} />
          <Text style={styles.rideAddr} numberOfLines={1}>{booking.pickupAddress || "Pickup"}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.ridePoint}>
          <View style={[styles.routeDot, { backgroundColor: "#EF4444" }]} />
          <Text style={styles.rideAddr} numberOfLines={1}>{booking.dropAddress || "Drop"}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>
            {booking.parcelType ? `${booking.parcelType.charAt(0).toUpperCase() + booking.parcelType.slice(1)}` : "Parcel"}
          </Text>
          <Text style={styles.totalAmount}>Rs. {(booking.fare || booking.estimatedFare)?.toLocaleString()}</Text>
        </View>
      </View>

      {booking.receiverName && (
        <View style={styles.etaBar}>
          <Ionicons name="person-outline" size={12} color={C.primary} />
          <Text style={styles.etaText}>Receiver: {booking.receiverName} · {booking.receiverPhone}</Text>
        </View>
      )}
    </View>
  );
}

/* ─────────────────────────── Section header ─────────────────────────── */
function SectionHeader({ title, count, active }: { title: string; count: number; active?: boolean }) {
  return (
    <View style={styles.secRow}>
      {active && <View style={styles.activeDot} />}
      <Text style={[styles.secTitle, !active && { color: C.textSecondary }]}>{title}</Text>
      <View style={[styles.countBadge, !active && { backgroundColor: C.textMuted }]}>
        <Text style={styles.countText}>{count}</Text>
      </View>
    </View>
  );
}

/* ─────────────────────────── Main Screen ─────────────────────────── */
export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [refreshing, setRefreshing] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const TAB_H  = Platform.OS === "web" ? 84 : 49;

  /* ── Grocery/Food orders ── */
  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useGetOrders(
    { userId: user?.id || "" },
    { query: { enabled: !!user?.id, refetchInterval: 30000 } }
  );

  /* ── Rides ── */
  const [ridesData, setRidesData] = useState<any>(null);
  const [ridesLoading, setRidesLoading] = useState(false);

  /* ── Pharmacy ── */
  const [pharmData, setPharmData] = useState<any>(null);
  const [pharmLoading, setPharmLoading] = useState(false);

  /* ── Parcel ── */
  const [parcelData, setParcelData] = useState<any>(null);
  const [parcelLoading, setParcelLoading] = useState(false);

  const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

  const fetchRides = useCallback(async () => {
    if (!user?.id) return;
    setRidesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/rides?userId=${user.id}`);
      const d = await res.json();
      setRidesData(d);
    } catch {}
    setRidesLoading(false);
  }, [user?.id]);

  const fetchPharmacy = useCallback(async () => {
    if (!user?.id) return;
    setPharmLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pharmacy-orders?userId=${user.id}`);
      const d = await res.json();
      setPharmData(d);
    } catch {}
    setPharmLoading(false);
  }, [user?.id]);

  const fetchParcel = useCallback(async () => {
    if (!user?.id) return;
    setParcelLoading(true);
    try {
      const res = await fetch(`${API_BASE}/parcel-bookings?userId=${user.id}`);
      const d = await res.json();
      setParcelData(d);
    } catch {}
    setParcelLoading(false);
  }, [user?.id]);

  React.useEffect(() => {
    if (user?.id) {
      fetchRides();
      fetchPharmacy();
      fetchParcel();
    }
  }, [user?.id]);

  // Auto-refresh rides, pharmacy, parcel every 30s (same as orders)
  React.useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => {
      fetchRides();
      fetchPharmacy();
      fetchParcel();
    }, 30000);
    return () => clearInterval(interval);
  }, [user?.id, fetchRides, fetchPharmacy, fetchParcel]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchOrders(), fetchRides(), fetchPharmacy(), fetchParcel()]);
    setRefreshing(false);
  }, [refetchOrders, fetchRides, fetchPharmacy, fetchParcel]);

  const allOrders = [...(ordersData?.orders || [])].reverse();
  const martOrders = allOrders.filter(o => o.type === "mart");
  const foodOrders = allOrders.filter(o => o.type === "food");
  const rides = (ridesData?.rides || []);
  const pharmOrders = (pharmData?.orders || pharmData?.pharmacyOrders || []);
  const parcels = (parcelData?.bookings || parcelData?.parcelBookings || []);

  const totalCount = allOrders.length + rides.length + pharmOrders.length + parcels.length;

  const isLoading = ordersLoading || ridesLoading || pharmLoading || parcelLoading;

  const renderContent = () => {
    if (isLoading && totalCount === 0) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={styles.loadingText}>Orders load ho rahe hain...</Text>
        </View>
      );
    }

    if (totalCount === 0) {
      return (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bag-outline" size={52} color={C.primary} />
          </View>
          <Text style={styles.emptyTitle}>Koi order nahi mila</Text>
          <Text style={styles.emptyText}>
            Shop karein, ride lein ya parcel bhejein — sab yahan dikhega
          </Text>
          <View style={styles.emptyBtns}>
            <Pressable onPress={() => router.push("/mart")} style={styles.emptyBtn}>
              <Ionicons name="storefront-outline" size={15} color="#fff" />
              <Text style={styles.emptyBtnText}>Mart</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/food")} style={[styles.emptyBtn, { backgroundColor: "#E65100" }]}>
              <Ionicons name="restaurant-outline" size={15} color="#fff" />
              <Text style={styles.emptyBtnText}>Food</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/ride")} style={[styles.emptyBtn, { backgroundColor: "#10B981" }]}>
              <Ionicons name="car-outline" size={15} color="#fff" />
              <Text style={styles.emptyBtnText}>Ride</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    /* ── Filter logic ── */
    let showOrders: any[] = [];
    let showMart: any[] = [];
    let showFood: any[] = [];
    let showRides: any[] = rides;
    let showPharm: any[] = pharmOrders;
    let showParcel: any[] = parcels;

    switch (activeTab) {
      case "all":
        showOrders = allOrders;
        break;
      case "mart":
        showMart = martOrders;
        showOrders = [];
        break;
      case "food":
        showFood = foodOrders;
        showOrders = [];
        break;
      case "rides":
        showOrders = [];
        showPharm = [];
        showParcel = [];
        break;
      case "pharmacy":
        showOrders = [];
        showRides = [];
        showParcel = [];
        break;
      case "parcel":
        showOrders = [];
        showRides = [];
        showPharm = [];
        break;
    }

    const displayOrders = activeTab === "all" ? allOrders : activeTab === "mart" ? showMart : activeTab === "food" ? showFood : [];
    const displayRides  = ["all", "rides"].includes(activeTab) ? showRides : [];
    const displayPharm  = ["all", "pharmacy"].includes(activeTab) ? showPharm : [];
    const displayParcel = ["all", "parcel"].includes(activeTab) ? showParcel : [];

    const activeOrders   = displayOrders.filter(o => !["delivered","cancelled"].includes(o.status));
    const pastOrders     = displayOrders.filter(o => ["delivered","cancelled"].includes(o.status));
    const activeRides    = displayRides.filter(r => !["completed","cancelled"].includes(r.status));
    const pastRides      = displayRides.filter(r => ["completed","cancelled"].includes(r.status));
    const activePharm    = displayPharm.filter(o => !["delivered","cancelled"].includes(o.status));
    const pastPharm      = displayPharm.filter(o => ["delivered","cancelled"].includes(o.status));
    const activeParcel   = displayParcel.filter(b => !["completed","cancelled"].includes(b.status));
    const pastParcel     = displayParcel.filter(b => ["completed","cancelled"].includes(b.status));

    const anyActive = activeOrders.length + activeRides.length + activePharm.length + activeParcel.length;
    const anyPast   = pastOrders.length + pastRides.length + pastPharm.length + pastParcel.length;

    if (anyActive + anyPast === 0) {
      return (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={44} color={C.textMuted} />
          <Text style={styles.emptyTitle}>
            {activeTab === "mart" ? "Koi mart order nahi" :
             activeTab === "food" ? "Koi food order nahi" :
             activeTab === "rides" ? "Koi ride nahi" :
             activeTab === "pharmacy" ? "Koi pharmacy order nahi" :
             "Koi parcel booking nahi"}
          </Text>
          <Text style={styles.emptyText}>Is section mein abhi tak koi activity nahi hai</Text>
        </View>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {anyActive > 0 && (
          <>
            <SectionHeader title="Active" count={anyActive} active />
            {activeOrders.map(o => <OrderCard key={o.id} order={o} />)}
            {activeRides.map(r => <RideCard key={r.id} ride={r} />)}
            {activePharm.map(o => <PharmacyCard key={o.id} order={o} />)}
            {activeParcel.map(b => <ParcelCard key={b.id} booking={b} />)}
          </>
        )}

        {anyPast > 0 && (
          <>
            <SectionHeader title="History" count={anyPast} />
            {pastOrders.map(o => <OrderCard key={o.id} order={o} />)}
            {pastRides.map(r => <RideCard key={r.id} ride={r} />)}
            {pastPharm.map(o => <PharmacyCard key={o.id} order={o} />)}
            {pastParcel.map(b => <ParcelCard key={b.id} booking={b} />)}
          </>
        )}
        <View style={{ height: TAB_H + insets.bottom + 20 }} />
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <LinearGradient
        colors={["#0F3BA8", C.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.headerSub}>
          {totalCount > 0 ? `${totalCount} total bookings` : "Track all your activity here"}
        </Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map(tab => {
            const count =
              tab.key === "all"      ? totalCount :
              tab.key === "mart"     ? martOrders.length :
              tab.key === "food"     ? foodOrders.length :
              tab.key === "rides"    ? rides.length :
              tab.key === "pharmacy" ? pharmOrders.length :
              parcels.length;

            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tab, isActive && styles.tabActive]}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={14}
                  color={isActive ? "#fff" : C.textSecondary}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, isActive && { backgroundColor: "rgba(255,255,255,0.35)" }]}>
                    <Text style={[styles.tabBadgeText, isActive && { color: "#fff" }]}>{count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff", marginBottom: 4 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.8)" },

  tabsWrap: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  tabs: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: C.surfaceSecondary,
  },
  tabActive: { backgroundColor: C.primary },
  tabLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: C.textSecondary },
  tabLabelActive: { color: "#fff" },
  tabBadge: {
    backgroundColor: C.border, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  tabBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9, color: C.textMuted },

  scroll: { paddingBottom: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textMuted },

  emptyIcon: { width: 100, height: 100, borderRadius: 28, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.text, textAlign: "center" },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.textSecondary, textAlign: "center" },
  emptyBtns: { flexDirection: "row", gap: 10, marginTop: 6 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },

  secRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  secTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: C.text, flex: 1 },
  countBadge: { backgroundColor: C.primary, borderRadius: 10, minWidth: 22, height: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  countText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#fff" },

  card: {
    backgroundColor: C.surface, borderRadius: 18,
    marginHorizontal: 16, marginBottom: 12, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  cardId: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },

  cardItems: { marginBottom: 12, gap: 5 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.border },
  itemText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: C.textSecondary },
  itemPrice: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.text },
  moreItems: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted, marginLeft: 13 },

  noteRow: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginBottom: 10, padding: 8, backgroundColor: "#FFF8E1", borderRadius: 10 },
  noteText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: "#5D4037" },

  rideRoute: { marginBottom: 12, gap: 4 },
  ridePoint: { flexDirection: "row", alignItems: "center", gap: 10 },
  routeDot: { width: 9, height: 9, borderRadius: 5 },
  routeLine: { width: 2, height: 14, backgroundColor: C.border, marginLeft: 3.5 },
  rideAddr: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 13, color: C.text },

  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  totalWrap: { alignItems: "flex-end" },
  totalLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
  totalAmount: { fontFamily: "Inter_700Bold", fontSize: 17, color: C.text },

  etaBar: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.borderLight },
  etaText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },
  payBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  payText: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
});
