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

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { createOrder } from "@workspace/api-client-react";

const C = Colors.light;
type PayMethod = "cash" | "wallet";

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [loading, setLoading] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const deliveryFee = 80;
  const grandTotal = total + deliveryFee;

  const handleCheckout = async () => {
    if (!user) { Alert.alert("Login Required", "Please login to place an order"); return; }
    if (items.length === 0) { Alert.alert("Empty Cart", "Add items to your cart first"); return; }
    if (payMethod === "wallet" && user.walletBalance < grandTotal) {
      Alert.alert("Insufficient Balance", `Your wallet balance (Rs. ${user.walletBalance}) is less than Rs. ${grandTotal}`);
      return;
    }
    setLoading(true);
    try {
      await createOrder({
        userId: user.id,
        type: "mart",
        items: items.map(i => ({ productId: i.productId, name: i.name, price: i.price, quantity: i.quantity, image: i.image })),
        deliveryAddress: "Home, AJK",
        paymentMethod: payMethod,
      });
      clearCart();
      Alert.alert("Order Placed!", "Your order is confirmed.", [
        { text: "Track Order", onPress: () => router.push("/(tabs)/orders") },
        { text: "Continue Shopping", onPress: () => router.push("/") },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to place order");
    }
    setLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Cart ({items.length})</Text>
          {items.length > 0 && (
            <Pressable onPress={() => Alert.alert("Clear Cart?", "Remove all items?", [{ text: "Cancel" }, { text: "Clear", onPress: clearCart }])}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          )}
        </View>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bag-outline" size={80} color={C.border} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Add items from the mart or food section</Text>
          <Pressable onPress={() => router.push("/mart")} style={styles.shopBtn}>
            <Text style={styles.shopBtnText}>Browse Mart</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/food")} style={[styles.shopBtn, { backgroundColor: C.foodLight }]}>
            <Text style={[styles.shopBtnText, { color: C.food }]}>Browse Food</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.itemsList}>
              {items.map(item => (
                <View key={item.productId} style={styles.cartItem}>
                  <View style={styles.cartItemImage}>
                    <Ionicons name="basket-outline" size={24} color={C.textMuted} />
                  </View>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.cartItemPrice}>Rs. {item.price} each</Text>
                  </View>
                  <View style={styles.qtyControl}>
                    <Pressable onPress={() => updateQuantity(item.productId, item.quantity - 1)} style={styles.qtyBtn}>
                      <Ionicons name="remove" size={16} color={C.primary} />
                    </Pressable>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <Pressable onPress={() => updateQuantity(item.productId, item.quantity + 1)} style={styles.qtyBtn}>
                      <Ionicons name="add" size={16} color={C.primary} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.payCard}>
              <Text style={styles.payTitle}>Payment Method</Text>
              <Pressable onPress={() => setPayMethod("cash")} style={[styles.payOption, payMethod === "cash" && styles.payOptionActive]}>
                <Ionicons name="cash-outline" size={20} color={payMethod === "cash" ? C.primary : C.textSecondary} />
                <Text style={[styles.payOptionText, payMethod === "cash" && styles.payOptionTextActive]}>Cash on Delivery</Text>
                {payMethod === "cash" && <Ionicons name="checkmark-circle" size={20} color={C.primary} />}
              </Pressable>
              <Pressable onPress={() => setPayMethod("wallet")} style={[styles.payOption, payMethod === "wallet" && styles.payOptionActive]}>
                <Ionicons name="wallet-outline" size={20} color={payMethod === "wallet" ? C.primary : C.textSecondary} />
                <Text style={[styles.payOptionText, payMethod === "wallet" && styles.payOptionTextActive]}>
                  AJKMart Wallet (Rs. {user?.walletBalance || 0})
                </Text>
                {payMethod === "wallet" && <Ionicons name="checkmark-circle" size={20} color={C.primary} />}
              </Pressable>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>Rs. {total}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={styles.summaryValue}>Rs. {deliveryFee}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>Rs. {grandTotal}</Text>
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          <View style={[styles.checkoutBar, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 12 }]}>
            <View style={styles.totalInfo}>
              <Text style={styles.totalSmall}>Total</Text>
              <Text style={styles.totalBig}>Rs. {grandTotal}</Text>
            </View>
            <Pressable onPress={handleCheckout} style={[styles.checkoutBtn, loading && styles.checkoutBtnDisabled]} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.checkoutBtnText}>Place Order</Text>}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: C.surface, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  headerRow: { flexDirection: "row", alignItems: "center" },
  backBtn: { padding: 6, marginRight: 10 },
  headerTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 20, color: C.text },
  clearText: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.danger, padding: 6 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.text },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textSecondary, textAlign: "center" },
  shopBtn: { backgroundColor: C.rideLight, paddingHorizontal: 32, paddingVertical: 13, borderRadius: 14, marginTop: 4 },
  shopBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.primary },
  scroll: { flex: 1 },
  itemsList: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  cartItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface, borderRadius: 14, padding: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  cartItemImage: { width: 50, height: 50, borderRadius: 12, backgroundColor: C.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.text, marginBottom: 4 },
  cartItemPrice: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textSecondary },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surfaceSecondary, borderRadius: 10, padding: 6 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  qtyText: { fontFamily: "Inter_700Bold", fontSize: 14, color: C.text, minWidth: 20, textAlign: "center" },
  payCard: { margin: 16, backgroundColor: C.surface, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  payTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: C.text, marginBottom: 12 },
  payOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, marginBottom: 8 },
  payOptionActive: { borderColor: C.primary, backgroundColor: C.rideLight },
  payOptionText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, color: C.textSecondary },
  payOptionTextActive: { color: C.primary },
  summaryCard: { marginHorizontal: 16, backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  summaryTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: C.text, marginBottom: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textSecondary },
  summaryValue: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.text },
  summaryTotal: { borderBottomWidth: 0, marginTop: 4 },
  totalLabel: { fontFamily: "Inter_700Bold", fontSize: 16, color: C.text },
  totalValue: { fontFamily: "Inter_700Bold", fontSize: 18, color: C.primary },
  checkoutBar: { backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8 },
  totalInfo: { flex: 1 },
  totalSmall: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },
  totalBig: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.text },
  checkoutBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  checkoutBtnDisabled: { opacity: 0.7 },
  checkoutBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
});
