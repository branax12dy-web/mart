import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useGetOrders } from "@workspace/api-client-react";

const C = Colors.light;

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  confirmed: "#3B82F6",
  preparing: "#8B5CF6",
  out_for_delivery: "#10B981",
  delivered: "#6B7280",
  cancelled: "#EF4444",
};

const STATUS_ICONS: Record<string, string> = {
  pending: "time-outline",
  confirmed: "checkmark-circle-outline",
  preparing: "flame-outline",
  out_for_delivery: "bicycle-outline",
  delivered: "checkmark-done-outline",
  cancelled: "close-circle-outline",
};

function OrderCard({ order }: { order: any }) {
  const statusColor = STATUS_COLORS[order.status] || "#6B7280";
  const statusIcon = STATUS_ICONS[order.status] || "help-outline";

  return (
    <Pressable style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={[styles.orderTypeBadge, { backgroundColor: order.type === "food" ? C.foodLight : C.martLight }]}>
          <Ionicons
            name={order.type === "food" ? "restaurant-outline" : "storefront-outline"}
            size={14}
            color={order.type === "food" ? C.food : C.mart}
          />
          <Text style={[styles.orderTypeText, { color: order.type === "food" ? C.food : C.mart }]}>
            {order.type === "food" ? "Food" : "Mart"}
          </Text>
        </View>
        <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
      </View>

      <View style={styles.orderItems}>
        {order.items?.slice(0, 2).map((item: any, i: number) => (
          <Text key={i} style={styles.orderItem}>
            {item.quantity}x {item.name}
          </Text>
        ))}
        {order.items?.length > 2 && (
          <Text style={styles.orderMore}>+{order.items.length - 2} more</Text>
        )}
      </View>

      <View style={styles.orderFooter}>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
          <Ionicons name={statusIcon as any} size={14} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {order.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
          </Text>
        </View>
        <Text style={styles.orderTotal}>Rs. {order.total}</Text>
      </View>

      {order.estimatedTime && order.status !== "delivered" && order.status !== "cancelled" && (
        <View style={styles.etaRow}>
          <Ionicons name="time-outline" size={13} color={C.textMuted} />
          <Text style={styles.etaText}>ETA: {order.estimatedTime}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading } = useGetOrders(
    { userId: user?.id || "" },
    { query: { enabled: !!user?.id } }
  );

  const orders = data?.orders || [];

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bag-outline" size={64} color={C.border} />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>Your order history will appear here</Text>
          <Pressable onPress={() => router.push("/mart")} style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>Start Shopping</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} style={styles.scroll}>
          {orders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
          <View style={{ height: Platform.OS === "web" ? 34 : 20 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: C.text,
  },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: C.text },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textSecondary },
  emptyBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  orderCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  orderTypeText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  orderId: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },
  orderItems: { marginBottom: 12 },
  orderItem: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textSecondary, marginBottom: 2 },
  orderMore: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted, marginTop: 2 },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  orderTotal: { fontFamily: "Inter_700Bold", fontSize: 16, color: C.text },
  etaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  etaText: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },
});
