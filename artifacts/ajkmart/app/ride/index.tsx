import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { bookRide, estimateFare } from "@workspace/api-client-react";

const C = Colors.light;

type RideType = "car" | "bike";
type PayMethod = "cash" | "wallet";

export default function RideScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [rideType, setRideType] = useState<RideType>("bike");
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [estimate, setEstimate] = useState<{ fare: number; distance: number; duration: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [booked, setBooked] = useState<any>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleEstimate = async () => {
    if (!pickup || !drop) { Alert.alert("Required", "Enter pickup and drop locations"); return; }
    setEstimating(true);
    try {
      const res = await estimateFare({ pickupLat: 33.7, pickupLng: 73.4, dropLat: 33.72, dropLng: 73.44, type: rideType });
      setEstimate(res);
    } catch { Alert.alert("Error", "Could not estimate fare"); }
    setEstimating(false);
  };

  const handleBook = async () => {
    if (!user) { Alert.alert("Login Required", "Please login to book a ride"); return; }
    if (!pickup || !drop) { Alert.alert("Required", "Enter locations"); return; }
    setLoading(true);
    try {
      const res = await bookRide({
        userId: user.id,
        type: rideType,
        pickupAddress: pickup,
        dropAddress: drop,
        pickupLat: 33.7,
        pickupLng: 73.4,
        dropLat: 33.72,
        dropLng: 73.44,
        paymentMethod: payMethod,
      });
      setBooked(res);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Booking failed");
    }
    setLoading(false);
  };

  if (booked) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => { setBooked(null); setPickup(""); setDrop(""); setEstimate(null); }} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Ride Booked</Text>
            <View style={{ width: 34 }} />
          </View>
        </View>
        <View style={styles.bookedContainer}>
          <View style={styles.bookedIcon}>
            <Ionicons name="checkmark-circle" size={80} color={C.success} />
          </View>
          <Text style={styles.bookedTitle}>Ride Confirmed!</Text>
          <Text style={styles.bookedSub}>Your {booked.type === "bike" ? "bike" : "car"} is on the way</Text>

          <View style={styles.rideDetails}>
            <View style={styles.rideDetailRow}>
              <Ionicons name="location-outline" size={18} color={C.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rideDetailLabel}>Pickup</Text>
                <Text style={styles.rideDetailValue}>{booked.pickupAddress}</Text>
              </View>
            </View>
            <View style={[styles.rideDetailRow, { borderTopWidth: 1, borderTopColor: C.border }]}>
              <Ionicons name="flag-outline" size={18} color={C.danger} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rideDetailLabel}>Drop</Text>
                <Text style={styles.rideDetailValue}>{booked.dropAddress}</Text>
              </View>
            </View>
          </View>

          <View style={styles.fareSummary}>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Fare</Text>
              <Text style={styles.fareValue}>Rs. {booked.fare}</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Distance</Text>
              <Text style={styles.fareValue}>{booked.distance} km</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Payment</Text>
              <Text style={styles.fareValue}>{booked.paymentMethod === "wallet" ? "AJKMart Wallet" : "Cash"}</Text>
            </View>
          </View>

          <Pressable onPress={() => { setBooked(null); router.push("/"); }} style={styles.homeBtn}>
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Book a Ride</Text>
          <View style={{ width: 34 }} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.mapPlaceholder}>
          <LinearGradient colors={["#DBEAFE", "#EFF6FF"]} style={styles.mapGrad}>
            <Ionicons name="map-outline" size={48} color={C.primary} />
            <Text style={styles.mapText}>Map View</Text>
            <Text style={styles.mapSubText}>Live tracking available after booking</Text>
          </LinearGradient>
        </View>

        <View style={styles.formCard}>
          <View style={styles.locationInput}>
            <View style={styles.locationDot} />
            <TextInput
              style={styles.locationField}
              value={pickup}
              onChangeText={setPickup}
              placeholder="Pickup location"
              placeholderTextColor={C.textMuted}
            />
          </View>
          <View style={styles.locationSep} />
          <View style={styles.locationInput}>
            <View style={[styles.locationDot, { backgroundColor: C.danger }]} />
            <TextInput
              style={styles.locationField}
              value={drop}
              onChangeText={setDrop}
              placeholder="Drop location"
              placeholderTextColor={C.textMuted}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Choose Vehicle</Text>
        <View style={styles.rideTypes}>
          <Pressable onPress={() => setRideType("bike")} style={[styles.rideType, rideType === "bike" && styles.rideTypeActive]}>
            <Ionicons name="bicycle-outline" size={28} color={rideType === "bike" ? C.primary : C.textSecondary} />
            <Text style={[styles.rideTypeLabel, rideType === "bike" && styles.rideTypeLabelActive]}>Bike</Text>
            <Text style={styles.rideTypePrice}>From Rs. 50</Text>
          </Pressable>
          <Pressable onPress={() => setRideType("car")} style={[styles.rideType, rideType === "car" && styles.rideTypeActive]}>
            <Ionicons name="car-outline" size={28} color={rideType === "car" ? C.primary : C.textSecondary} />
            <Text style={[styles.rideTypeLabel, rideType === "car" && styles.rideTypeLabelActive]}>Car</Text>
            <Text style={styles.rideTypePrice}>From Rs. 100</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Payment Method</Text>
        <View style={styles.payMethods}>
          <Pressable onPress={() => setPayMethod("cash")} style={[styles.payMethod, payMethod === "cash" && styles.payMethodActive]}>
            <Ionicons name="cash-outline" size={22} color={payMethod === "cash" ? C.primary : C.textSecondary} />
            <Text style={[styles.payMethodLabel, payMethod === "cash" && styles.payMethodLabelActive]}>Cash</Text>
          </Pressable>
          <Pressable onPress={() => setPayMethod("wallet")} style={[styles.payMethod, payMethod === "wallet" && styles.payMethodActive]}>
            <Ionicons name="wallet-outline" size={22} color={payMethod === "wallet" ? C.primary : C.textSecondary} />
            <View>
              <Text style={[styles.payMethodLabel, payMethod === "wallet" && styles.payMethodLabelActive]}>Wallet</Text>
              <Text style={styles.payMethodSub}>Rs. {user?.walletBalance || 0}</Text>
            </View>
          </Pressable>
        </View>

        {estimate && (
          <View style={styles.estimateCard}>
            <Text style={styles.estimateTitle}>Fare Estimate</Text>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Distance</Text>
              <Text style={styles.estimateValue}>{estimate.distance} km</Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Duration</Text>
              <Text style={styles.estimateValue}>{estimate.duration}</Text>
            </View>
            <View style={[styles.estimateRow, { borderTopWidth: 1.5, borderTopColor: C.border, marginTop: 8, paddingTop: 8 }]}>
              <Text style={[styles.estimateLabel, { fontFamily: "Inter_700Bold", color: C.text }]}>Total Fare</Text>
              <Text style={[styles.estimateValue, { fontFamily: "Inter_700Bold", fontSize: 18, color: C.primary }]}>Rs. {estimate.fare}</Text>
            </View>
          </View>
        )}

        <View style={styles.actionBtns}>
          <Pressable onPress={handleEstimate} style={styles.estimateBtn} disabled={estimating}>
            {estimating ? <ActivityIndicator color={C.primary} /> : <Text style={styles.estimateBtnText}>Get Estimate</Text>}
          </Pressable>
          <Pressable onPress={handleBook} style={[styles.bookBtn, loading && styles.bookBtnDisabled]} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookBtnText}>Book Now</Text>}
          </Pressable>
        </View>

        <View style={{ height: Platform.OS === "web" ? 34 : 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: C.surface, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  headerRow: { flexDirection: "row", alignItems: "center" },
  backBtn: { padding: 6, marginRight: 10 },
  headerTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 20, color: C.text },
  scrollContent: { paddingBottom: 20 },
  mapPlaceholder: { height: 180, overflow: "hidden" },
  mapGrad: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  mapText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: C.primary },
  mapSubText: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.textSecondary },
  formCard: { margin: 16, backgroundColor: C.surface, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  locationInput: { flexDirection: "row", alignItems: "center", gap: 12 },
  locationDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.primary },
  locationField: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: C.text, paddingVertical: 8 },
  locationSep: { height: 1, backgroundColor: C.border, marginVertical: 8, marginLeft: 24 },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 15, color: C.text, marginHorizontal: 16, marginBottom: 10, marginTop: 4 },
  rideTypes: { flexDirection: "row", paddingHorizontal: 16, gap: 12, marginBottom: 20 },
  rideType: { flex: 1, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 14, alignItems: "center", gap: 6, backgroundColor: C.surface },
  rideTypeActive: { borderColor: C.primary, backgroundColor: C.rideLight },
  rideTypeLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.textSecondary },
  rideTypeLabelActive: { color: C.primary },
  rideTypePrice: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
  payMethods: { flexDirection: "row", paddingHorizontal: 16, gap: 12, marginBottom: 20 },
  payMethod: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 14, backgroundColor: C.surface },
  payMethodActive: { borderColor: C.primary, backgroundColor: C.rideLight },
  payMethodLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.textSecondary },
  payMethodLabelActive: { color: C.primary },
  payMethodSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
  estimateCard: { marginHorizontal: 16, backgroundColor: C.surface, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: C.border, marginBottom: 16 },
  estimateTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: C.text, marginBottom: 12 },
  estimateRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  estimateLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textSecondary },
  estimateValue: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.text },
  actionBtns: { flexDirection: "row", paddingHorizontal: 16, gap: 12 },
  estimateBtn: { flex: 1, borderWidth: 1.5, borderColor: C.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  estimateBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.primary },
  bookBtn: { flex: 2, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  bookBtnDisabled: { opacity: 0.7 },
  bookBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  bookedContainer: { flex: 1, alignItems: "center", padding: 24, gap: 20 },
  bookedIcon: { marginTop: 30 },
  bookedTitle: { fontFamily: "Inter_700Bold", fontSize: 26, color: C.text },
  bookedSub: { fontFamily: "Inter_400Regular", fontSize: 15, color: C.textSecondary },
  rideDetails: { width: "100%", backgroundColor: C.surface, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  rideDetailRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 },
  rideDetailLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted, marginBottom: 2 },
  rideDetailValue: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.text },
  fareSummary: { width: "100%", backgroundColor: C.surface, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  fareRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  fareLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textSecondary },
  fareValue: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.text },
  homeBtn: { width: "100%", backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  homeBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
});
