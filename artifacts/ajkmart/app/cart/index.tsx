import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
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
import { useToast } from "@/context/ToastContext";
import { createOrder } from "@workspace/api-client-react";

const C = Colors.light;
type PayMethod = "cash" | "wallet";

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  city: string;
  icon: string;
  isDefault: boolean;
}

function AddressPickerModal({
  visible,
  addresses,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  addresses: SavedAddress[];
  selected: string;
  onSelect: (a: SavedAddress) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Delivery Address Chunein</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
            {addresses.map(addr => {
              const isSel = selected === addr.id;
              return (
                <Pressable
                  key={addr.id}
                  onPress={() => { onSelect(addr); onClose(); }}
                  style={[styles.addrOpt, isSel && styles.addrOptSel]}
                >
                  <View style={[styles.addrOptIcon, { backgroundColor: isSel ? "#DBEAFE" : C.surfaceSecondary }]}>
                    <Ionicons name={(addr.icon as any) || "location-outline"} size={20} color={isSel ? C.primary : C.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={[styles.addrOptLabel, isSel && { color: C.primary }]}>{addr.label}</Text>
                      {addr.isDefault && (
                        <View style={styles.defaultTag}>
                          <Text style={styles.defaultTagText}>Default</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.addrOptAddress} numberOfLines={1}>{addr.address}</Text>
                    <Text style={styles.addrOptCity}>{addr.city}</Text>
                  </View>
                  {isSel && <Ionicons name="checkmark-circle" size={22} color={C.primary} />}
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const { items, total, cartType, updateQuantity, clearCart } = useCart();
  const { showToast } = useToast();

  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [loading, setLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ id: string; time: string } | null>(null);

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddrId, setSelectedAddrId] = useState<string>("");
  const [showAddrPicker, setShowAddrPicker] = useState(false);
  const [addrLoading, setAddrLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [deliveryFeeConfig, setDeliveryFeeConfig] = useState<{ mart: number; food: number }>({ mart: 80, food: 60 });
  const [freeDeliveryAbove, setFreeDeliveryAbove] = useState(1000);

  useEffect(() => {
    const API = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
    fetch(`${API}/platform-config`)
      .then(r => r.json())
      .then(d => {
        if (d.deliveryFee) {
          setDeliveryFeeConfig({ mart: d.deliveryFee.mart, food: d.deliveryFee.food });
        }
        if (d.platform?.freeDeliveryAbove) setFreeDeliveryAbove(d.platform.freeDeliveryAbove);
      })
      .catch(() => {});
  }, []);

  const deliveryFee = total >= freeDeliveryAbove ? 0 : (cartType === "food" ? deliveryFeeConfig.food : deliveryFeeConfig.mart);
  const grandTotal = total + deliveryFee;

  const selectedAddr = addresses.find(a => a.id === selectedAddrId);
  const deliveryLine = selectedAddr
    ? `${selectedAddr.label} — ${selectedAddr.address}, ${selectedAddr.city}`
    : "Home, AJK, Pakistan";

  useEffect(() => {
    if (!user?.id) return;
    const API = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
    setAddrLoading(true);
    fetch(`${API}/addresses?userId=${user.id}`)
      .then(r => r.json())
      .then(d => {
        const addrs: SavedAddress[] = d.addresses || [];
        setAddresses(addrs);
        const def = addrs.find(a => a.isDefault) || addrs[0];
        if (def) setSelectedAddrId(def.id);
      })
      .catch(() => {})
      .finally(() => setAddrLoading(false));
  }, [user?.id]);

  const handleCheckout = async () => {
    if (!user) { showToast("Login karein order place karne ke liye", "error"); return; }
    if (items.length === 0) { showToast("Cart mein koi item nahi", "error"); return; }
    if (payMethod === "wallet" && user.walletBalance < grandTotal) {
      showToast(`Wallet mein Rs. ${user.walletBalance} hain — Rs. ${grandTotal} chahiye`, "error");
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
        deliveryAddress: deliveryLine,
        paymentMethod: payMethod,
      });

      if (payMethod === "wallet") {
        updateUser({ walletBalance: user.walletBalance - grandTotal });
      }

      clearCart();
      setOrderSuccess({
        id: (order as any).id?.slice(-6).toUpperCase() || "------",
        time: (order as any).estimatedTime || "30-45 min",
      });
    } catch (e: any) {
      showToast(e.message || "Order place nahi ho saka. Dobara try karein.", "error");
    }
    setLoading(false);
  };

  if (orderSuccess) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={styles.successWrap}>
          <LinearGradient colors={["#065F46", "#059669"]} style={styles.successCircle}>
            <Ionicons name="checkmark" size={44} color="#fff" />
          </LinearGradient>
          <Text style={styles.successTitle}>Order Place Ho Gaya!</Text>
          <Text style={styles.successId}>Order #{orderSuccess.id}</Text>
          <Text style={styles.successAddr} numberOfLines={2}>{deliveryLine}</Text>
          <Text style={styles.successEta}>ETA: {orderSuccess.time}</Text>
          <View style={styles.successBtns}>
            <Pressable onPress={() => router.push("/(tabs)/orders")} style={styles.trackBtn}>
              <Ionicons name="navigate-outline" size={16} color="#fff" />
              <Text style={styles.trackBtnTxt}>Track Order</Text>
            </Pressable>
            <Pressable onPress={() => router.replace("/(tabs)")} style={styles.homeBtn}>
              <Ionicons name="home-outline" size={16} color={C.primary} />
              <Text style={styles.homeBtnTxt}>Home</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: C.text }]}>Cart</Text>
            <View style={{ width: 34 }} />
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="bag-outline" size={52} color={C.primary} />
          </View>
          <Text style={styles.emptyTitle}>Cart Khaali Hai</Text>
          <Text style={styles.emptyText}>Mart ya Food section se items add karein</Text>
          <View style={styles.emptyBtns}>
            <Pressable onPress={() => router.push("/mart")} style={styles.emptyBtn}>
              <Ionicons name="storefront-outline" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Browse Mart</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/food")} style={[styles.emptyBtn, { backgroundColor: "#E65100" }]}>
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
            <Text style={styles.headerTitle}>{cartType === "food" ? "Food Order" : "Mart Order"}</Text>
            <Text style={styles.headerSub}>{items.length} item{items.length !== 1 ? "s" : ""}</Text>
          </View>
          <Pressable onPress={() => setShowClearConfirm(true)} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        </View>

        {showClearConfirm && (
          <View style={styles.clearConfirm}>
            <Text style={styles.clearConfirmTxt}>Saare items remove karein?</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={() => setShowClearConfirm(false)} style={styles.clearNo}>
                <Text style={styles.clearNoTxt}>Nahi</Text>
              </Pressable>
              <Pressable onPress={() => { clearCart(); setShowClearConfirm(false); }} style={styles.clearYes}>
                <Text style={styles.clearYesTxt}>Haan</Text>
              </Pressable>
            </View>
          </View>
        )}
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aapke Items</Text>
          {items.map(item => (
            <View key={item.productId} style={styles.cartItem}>
              <View style={[styles.itemThumb, { backgroundColor: item.type === "food" ? "#FFF3E0" : "#E3F2FD" }]}>
                <Ionicons
                  name={item.type === "food" ? "restaurant-outline" : "basket-outline"}
                  size={22}
                  color={item.type === "food" ? "#E65100" : "#0D47A1"}
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

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <Pressable
            onPress={() => {
              if (addresses.length === 0) {
                showToast("Profile mein pehle address add karein", "info");
                return;
              }
              setShowAddrPicker(true);
            }}
            style={styles.addrCard}
          >
            <View style={styles.addrCardIcon}>
              <Ionicons name="location-outline" size={20} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              {addrLoading ? (
                <ActivityIndicator size="small" color={C.primary} />
              ) : (
                <>
                  <Text style={styles.addrCardLabel}>
                    {selectedAddr ? selectedAddr.label : "Home"}
                  </Text>
                  <Text style={styles.addrCardValue} numberOfLines={2}>
                    {selectedAddr ? `${selectedAddr.address}, ${selectedAddr.city}` : "AJK, Pakistan"}
                  </Text>
                </>
              )}
            </View>
            {addresses.length > 0 && (
              <View style={styles.changeBtn}>
                <Text style={styles.changeBtnText}>Change</Text>
                <Ionicons name="chevron-forward" size={14} color={C.primary} />
              </View>
            )}
          </Pressable>
        </View>

        {/* Estimated Time */}
        <View style={[styles.section, styles.etaRow]}>
          <Ionicons name="time-outline" size={18} color={C.success} />
          <Text style={styles.etaText}>
            Estimated delivery: {cartType === "food" ? "25–40 min" : "30–50 min"}
          </Text>
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
              <Text style={styles.paySub}>Delivery par payment karein</Text>
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
              <Text style={[styles.paySub, user && user.walletBalance < grandTotal && { color: C.danger }]}>
                Balance: Rs. {user?.walletBalance?.toLocaleString() || 0}
                {user && user.walletBalance < grandTotal ? " (kam hai)" : ""}
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

      {/* Checkout Bar */}
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

      <AddressPickerModal
        visible={showAddrPicker}
        addresses={addresses}
        selected={selectedAddrId}
        onSelect={a => setSelectedAddrId(a.id)}
        onClose={() => setShowAddrPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff" },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.8)" },
  clearBtn: { padding: 6 },
  clearText: { fontFamily: "Inter_500Medium", fontSize: 14, color: "rgba(255,255,255,0.85)" },
  clearConfirm: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 12, marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  clearConfirmTxt: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#fff", flex: 1 },
  clearNo: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)" },
  clearNoTxt: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  clearYes: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: "#EF4444" },
  clearYesTxt: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },

  scroll: { flex: 1 },
  section: { marginTop: 16, marginHorizontal: 16 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: C.text, marginBottom: 10 },

  cartItem: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface, borderRadius: 14, padding: 12, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  itemThumb: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: C.text, marginBottom: 3 },
  itemUnit: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surfaceSecondary, borderRadius: 10, padding: 5 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  qtyText: { fontFamily: "Inter_700Bold", fontSize: 14, color: C.text, minWidth: 18, textAlign: "center" },
  itemTotal: { fontFamily: "Inter_700Bold", fontSize: 14, color: C.text, width: 62, textAlign: "right" },

  addrCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: C.borderLight, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  addrCardIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  addrCardLabel: { fontFamily: "Inter_700Bold", fontSize: 13, color: C.text, marginBottom: 2 },
  addrCardValue: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textSecondary },
  changeBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: "#EFF6FF" },
  changeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: C.primary },

  etaRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F0FDF4", borderRadius: 12, padding: 12, marginTop: 12 },
  etaText: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#065F46" },

  payOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface, marginBottom: 8 },
  payOptionActive: { borderColor: C.primary, backgroundColor: "#F0F7FF" },
  payIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  payLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.textSecondary, marginBottom: 2 },
  paySub: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: C.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },

  summaryCard: { backgroundColor: C.surface, borderRadius: 14, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textSecondary },
  summaryValue: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.text },
  summaryDivider: { borderTopWidth: 1.5, borderTopColor: C.border, marginTop: 4, paddingTop: 12 },
  grandLabel: { fontFamily: "Inter_700Bold", fontSize: 16, color: C.text },
  grandValue: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.primary },

  checkoutBar: { backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, gap: 14, shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 10 },
  checkoutInfo: { flex: 1 },
  checkoutLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },
  checkoutAmount: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.text },
  checkoutBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.primary, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 22 },
  checkoutBtnDisabled: { opacity: 0.65 },
  checkoutBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },

  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 32 },
  emptyIconBox: { width: 100, height: 100, borderRadius: 28, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.text },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textSecondary, textAlign: "center" },
  emptyBtns: { flexDirection: "row", gap: 12, marginTop: 6 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },

  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  successCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  successTitle: { fontFamily: "Inter_700Bold", fontSize: 26, color: C.text },
  successId: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.textSecondary },
  successAddr: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.textMuted, textAlign: "center", maxWidth: 280 },
  successEta: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textMuted },
  successBtns: { flexDirection: "row", gap: 12, marginTop: 12 },
  trackBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 14 },
  trackBtnTxt: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  homeBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: C.primary, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 14 },
  homeBtnTxt: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.primary },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: C.text, marginBottom: 4 },

  addrOpt: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface, marginBottom: 8 },
  addrOptSel: { borderColor: C.primary, backgroundColor: "#F0F7FF" },
  addrOptIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  addrOptLabel: { fontFamily: "Inter_700Bold", fontSize: 14, color: C.text, marginBottom: 2 },
  addrOptAddress: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textSecondary },
  addrOptCity: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
  defaultTag: { backgroundColor: "#D1FAE5", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  defaultTagText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#065F46" },

  cancelBtn: { marginTop: 12, padding: 14, borderRadius: 14, backgroundColor: C.surfaceSecondary, alignItems: "center" },
  cancelBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.textSecondary },
});
