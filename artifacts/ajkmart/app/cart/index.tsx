import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { useCart } from "@/context/CartContext";
import { createOrder } from "@workspace/api-client-react";

const C = Colors.light;
type PayMethod = "cash" | "wallet";

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const { items, total, cartType, updateQuantity, removeItem, clearCart } = useCart();
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [loading, setLoading] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const deliveryFee = cartType === "food" ? 60 : 80;
  const grandTotal = total + deliveryFee;

  const handleCheckout = async () => {
    if (!user) {
      Alert.alert("Login Required", "Please login to place an order");
      return;
    }
    if (items.length === 0) {
      Alert.alert("Empty Cart", "Add items to your cart first");
      return;
    }
    if (payMethod === "wallet" && user.walletBalance < grandTotal) {
      Alert.alert(
        "Insufficient Balance",
        `Wallet balance Rs. ${user.walletBalance} is less than Rs. ${grandTotal}. Please top up.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Top Up Wallet", onPress: () => router.push("/(tabs)/wallet") },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const order = await createOrder({
        userId: user.id,
        type: cartType === "mixed" ? "mart" : cartType,
        items: items.map(i => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image: i.image,
        })),
        deliveryAddress: "Home, AJK, Pakistan",
        paymentMethod: payMethod,
      });

      // Deduct wallet balance locally if wallet payment
      if (payMethod === "wallet") {
        updateUser({ walletBalance: user.walletBalance - grandTotal });
      }

      clearCart();

      Alert.alert(
        "✅ Order Placed!",
        `Your order #${(order as any).id?.slice(-6).toUpperCase()} has been confirmed.\nEstimated delivery: ${(order as any).estimatedTime || "30-45 min"}`,
        [
          { text: "Track Order", onPress: () => router.push("/(tabs)/orders") },
          { text: "Continue Shopping", onPress: () => router.back() },
        ]
      );
    } catch (e: any) {
      Alert.alert("Order Failed", e.message || "Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  if (items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Cart</Text>
            <View style={{ width: 34 }} />
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="bag-outline" size={52} color={C.primary} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Browse our mart or food section and add items</Text>
          <View style={styles.emptyBtns}>
            <Pressable onPress={() => router.push("/mart")} style={styles.emptyBtn}>
              <Ionicons name="storefront-outline" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Browse Mart</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/food")} style={[styles.emptyBtn, { backgroundColor: C.food }]}>
              <Ionicons name="restaurant-outline" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Order Food</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <LinearGradient
        colors={["#0F3BA8", C.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 8 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              {cartType === "food" ? "Food Order" : "Mart Order"}
            </Text>
            <Text style={styles.headerSub}>{items.length} item{items.length !== 1 ? "s" : ""}</Text>
          </View>
          <Pressable
            onPress={() => Alert.alert("Clear Cart?", "Remove all items?", [
              { text: "Cancel", style: "cancel" },
              { text: "Clear", style: "destructive", onPress: clearCart },
            ])}
            style={styles.clearBtn}
          >
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Items</Text>
          {items.map(item => (
            <View key={item.productId} style={styles.cartItem}>
              <View style={[styles.itemThumb, {
                backgroundColor: item.type === "food" ? C.foodLight : C.martLight,
              }]}>
                <Ionicons
                  name={item.type === "food" ? "restaurant-outline" : "basket-outline"}
                  size={22}
                  color={item.type === "food" ? C.food : C.mart}
                />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.itemUnit}>Rs. {item.price} each</Text>
              </View>
              <View style={styles.qtyControl}>
                <Pressable onPress={() => updateQuantity(item.productId, item.quantity - 1)} style={styles.qtyBtn}>
                  <Ionicons name={item.quantity === 1 ? "trash-outline" : "remove"} size={15} color={item.quantity === 1 ? C.danger : C.primary} />
                </Pressable>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <Pressable onPress={() => updateQuantity(item.productId, item.quantity + 1)} style={styles.qtyBtn}>
                  <Ionicons name="add" size={15} color={C.primary} />
                </Pressable>
              </View>
              <Text style={styles.itemTotal}>Rs. {item.price * item.quantity}</Text>
            </View>
          ))}
        </View>

        {/* Delivery Info */}
        <View style={[styles.section, styles.infoCard]}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={C.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Delivery Address</Text>
              <Text style={styles.infoValue}>Home, AJK, Pakistan</Text>
            </View>
            <Pressable>
              <Text style={styles.changeText}>Change</Text>
            </Pressable>
          </View>
          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: C.borderLight, marginTop: 8, paddingTop: 10 }]}>
            <Ionicons name="time-outline" size={18} color={C.success} />
            <Text style={styles.infoValue}>Estimated: 30–45 min</Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <Pressable onPress={() => setPayMethod("cash")} style={[styles.payOption, payMethod === "cash" && styles.payOptionActive]}>
            <View style={[styles.payIcon, { backgroundColor: payMethod === "cash" ? "#D1FAE5" : C.surfaceSecondary }]}>
              <Ionicons name="cash-outline" size={20} color={payMethod === "cash" ? C.success : C.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.payLabel, payMethod === "cash" && { color: C.text }]}>Cash on Delivery</Text>
              <Text style={styles.paySub}>Pay when order arrives</Text>
            </View>
            <View style={[styles.radio, payMethod === "cash" && styles.radioActive]}>
              {payMethod === "cash" && <View style={styles.radioDot} />}
            </View>
          </Pressable>
          <Pressable onPress={() => setPayMethod("wallet")} style={[styles.payOption, payMethod === "wallet" && styles.payOptionActive]}>
            <View style={[styles.payIcon, { backgroundColor: payMethod === "wallet" ? "#DBEAFE" : C.surfaceSecondary }]}>
              <Ionicons name="wallet-outline" size={20} color={payMethod === "wallet" ? C.primary : C.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.payLabel, payMethod === "wallet" && { color: C.text }]}>AJKMart Wallet</Text>
              <Text style={[styles.paySub, user?.walletBalance < grandTotal && { color: C.danger }]}>
                Balance: Rs. {user?.walletBalance?.toLocaleString() || 0}
                {user && user.walletBalance < grandTotal ? " (insufficient)" : ""}
              </Text>
            </View>
            <View style={[styles.radio, payMethod === "wallet" && styles.radioActive]}>
              {payMethod === "wallet" && <View style={styles.radioDot} />}
            </View>
          </Pressable>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</Text>
              <Text style={styles.summaryValue}>Rs. {total.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>Rs. {deliveryFee}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryDivider]}>
              <Text style={styles.grandLabel}>Grand Total</Text>
              <Text style={styles.grandValue}>Rs. {grandTotal.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Bottom checkout bar */}
      <View style={[styles.checkoutBar, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 12 }]}>
        <View style={styles.checkoutInfo}>
          <Text style={styles.checkoutLabel}>Total Amount</Text>
          <Text style={styles.checkoutAmount}>Rs. {grandTotal.toLocaleString()}</Text>
        </View>
        <Pressable
          onPress={handleCheckout}
          style={[styles.checkoutBtn, loading && styles.checkoutBtnDisabled]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.checkoutBtnText}>Place Order</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff" },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.8)" },
  clearBtn: { padding: 6 },
  clearText: { fontFamily: "Inter_500Medium", fontSize: 14, color: "rgba(255,255,255,0.85)" },
  scroll: { flex: 1 },
  section: { marginTop: 16, marginHorizontal: 16 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: C.text, marginBottom: 10 },
  cartItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.surface, borderRadius: 14, padding: 12,
    marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  itemThumb: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: C.text, marginBottom: 3 },
  itemUnit: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },
  qtyControl: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.surfaceSecondary, borderRadius: 10, padding: 5,
  },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.surface, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  qtyText: { fontFamily: "Inter_700Bold", fontSize: 14, color: C.text, minWidth: 18, textAlign: "center" },
  itemTotal: { fontFamily: "Inter_700Bold", fontSize: 14, color: C.text, width: 62, textAlign: "right" },
  infoCard: {
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted, marginBottom: 2 },
  infoValue: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.text, flex: 1 },
  changeText: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.primary },
  payOption: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surface, marginBottom: 8,
  },
  payOptionActive: { borderColor: C.primary, backgroundColor: "#F0F7FF" },
  payIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  payLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.textSecondary, marginBottom: 2 },
  paySub: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  radioActive: { borderColor: C.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  summaryCard: {
    backgroundColor: C.surface, borderRadius: 14, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textSecondary },
  summaryValue: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.text },
  summaryDivider: { borderTopWidth: 1.5, borderTopColor: C.border, marginTop: 4, paddingTop: 12 },
  grandLabel: { fontFamily: "Inter_700Bold", fontSize: 16, color: C.text },
  grandValue: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.primary },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 32 },
  emptyIconBox: { width: 100, height: 100, borderRadius: 28, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.text },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textSecondary, textAlign: "center" },
  emptyBtns: { flexDirection: "row", gap: 12, marginTop: 6 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  checkoutBar: {
    backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 12, gap: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 10,
  },
  checkoutInfo: { flex: 1 },
  checkoutLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },
  checkoutAmount: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.text },
  checkoutBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.primary, borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 22,
  },
  checkoutBtnDisabled: { opacity: 0.65 },
  checkoutBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
});
