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

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  pending:          { color: "#D97706", bg: "#FEF3C7", icon: "time-outline",           label: "Pending" },
  confirmed:        { color: "#2563EB", bg: "#DBEAFE", icon: "checkmark-circle-outline", label: "Confirmed" },
  preparing:        { color: "#7C3AED", bg: "#EDE9FE", icon: "flame-outline",           label: "Preparing" },
  out_for_delivery: { color: "#059669", bg: "#D1FAE5", icon: "bicycle-outline",         label: "On the Way" },
  delivered:        { color: "#6B7280", bg: "#F3F4F6", icon: "checkmark-done-outline",  label: "Delivered" },
  cancelled:        { color: "#DC2626", bg: "#FEE2E2", icon: "close-circle-outline",    label: "Cancelled" },
};

function OrderCard({ order }: { order: any }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["pending"];

  return (
    <Pressable style={styles.orderCard}>
      {/* top row */}
      <View style={styles.orderTop}>
        <View style={[styles.typeChip, {
          backgroundColor: order.type === "food" ? C.foodLight : C.martLight,
        }]}>
          <Ionicons
            name={order.type === "food" ? "restaurant-outline" : "storefront-outline"}
            size={13}
            color={order.type === "food" ? C.food : C.mart}
          />
          <Text style={[styles.typeChipText, { color: order.type === "food" ? C.food : C.mart }]}>
            {order.type === "food" ? "Food" : "Mart"}
          </Text>
        </View>
        <Text style={styles.orderId}>#{order.id.slice(-8).toUpperCase()}</Text>
      </View>

      {/* items */}
      <View style={styles.orderItems}>
        {(order.items || []).slice(0, 2).map((item: any, i: number) => (
          <View key={i} style={styles.itemRow}>
            <View style={styles.itemDot} />
            <Text style={styles.itemText} numberOfLines={1}>
              {item.quantity}× {item.name}
            </Text>
            <Text style={styles.itemPrice}>Rs. {item.price * item.quantity}</Text>
          </View>
        ))}
        {(order.items || []).length > 2 && (
          <Text style={styles.moreItems}>+{order.items.length - 2} more items</Text>
        )}
      </View>

      {/* footer */}
      <View style={styles.orderFooter}>
        <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>Rs. {order.total?.toLocaleString()}</Text>
        </View>
      </View>

      {/* ETA bar */}
      {order.estimatedTime && !["delivered", "cancelled"].includes(order.status) && (
        <View style={styles.etaBar}>
          <Ionicons name="time-outline" size={12} color={C.primary} />
          <Text style={styles.etaText}>Estimated: {order.estimatedTime}</Text>
          <View style={styles.payBadge}>
            <Ionicons
              name={order.paymentMethod === "wallet" ? "wallet-outline" : "cash-outline"}
              size={11}
              color={C.textMuted}
            />
            <Text style={styles.payText}>
              {order.paymentMethod === "wallet" ? "Wallet" : "Cash"}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, refetch } = useGetOrders(
    { userId: user?.id || "" },
    { query: { enabled: !!user?.id, refetchInterval: 30000 } }
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const orders = [...(data?.orders || [])].reverse();
  const active = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const past = orders.filter(o => ["delivered", "cancelled"].includes(o.status));

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* header */}
      <LinearGradient
        colors={["#0F3BA8", C.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.headerSub}>
          {data?.total ? `${data.total} total orders` : "Track all your orders"}
        </Text>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bag-outline" size={52} color={C.primary} />
          </View>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>Start shopping to see your orders here</Text>
          <View style={styles.emptyBtns}>
            <Pressable onPress={() => router.push("/mart")} style={styles.emptyBtn}>
              <Ionicons name="storefront-outline" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Shop Mart</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/food")} style={[styles.emptyBtn, { backgroundColor: C.food }]}>
              <Ionicons name="restaurant-outline" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Order Food</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          }
          contentContainerStyle={styles.scroll}
        >
          {active.length > 0 && (
            <>
              <View style={styles.secRow}>
                <View style={styles.activeDot} />
                <Text style={styles.secTitle}>Active Orders</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{active.length}</Text>
                </View>
              </View>
              {active.map(o => <OrderCard key={o.id} order={o} />)}
            </>
          )}

          {past.length > 0 && (
            <>
              <View style={styles.secRow}>
                <Text style={[styles.secTitle, { color: C.textSecondary }]}>Order History</Text>
              </View>
              {past.map(o => <OrderCard key={o.id} order={o} />)}
            </>
          )}

          <View style={{ height: Platform.OS === "web" ? 50 : 30 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff", marginBottom: 4 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.8)" },
  scroll: { paddingBottom: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textMuted },
  emptyIcon: {
    width: 100, height: 100, borderRadius: 28,
    backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.text },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textSecondary, textAlign: "center" },
  emptyBtns: { flexDirection: "row", gap: 12, marginTop: 6 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14,
  },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  secRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  secTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: C.text, flex: 1 },
  countBadge: {
    backgroundColor: C.primary, borderRadius: 10,
    minWidth: 22, height: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
  },
  countText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#fff" },
  orderCard: {
    backgroundColor: C.surface, borderRadius: 18,
    marginHorizontal: 16, marginBottom: 12, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  orderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  typeChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  typeChipText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  orderId: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },
  orderItems: { marginBottom: 12, gap: 5 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.border },
  itemText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: C.textSecondary },
  itemPrice: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.text },
  moreItems: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted, marginLeft: 13 },
  orderFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  totalWrap: { alignItems: "flex-end" },
  totalLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
  totalAmount: { fontFamily: "Inter_700Bold", fontSize: 17, color: C.text },
  etaBar: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.borderLight,
  },
  etaText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },
  payBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  payText: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
});
