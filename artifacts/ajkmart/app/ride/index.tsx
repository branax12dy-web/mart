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
type RideType  = "car" | "bike";
type PayMethod = "cash" | "wallet";

const POPULAR_LOCS = ["Muzaffarabad City", "Mirpur AJK", "Rawalakot", "Bagh", "Kotli", "Airport"];

/* ── Booked Confirmation Screen ── */
function BookedScreen({ booked, onReset }: { booked: any; onReset: () => void }) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* header */}
      <LinearGradient colors={["#059669", "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bookedHeader, { paddingTop: topPad + 16 }]}>
        <View style={[styles.bookedCircle, { width: 180, height: 180, top: -50, right: -50 }]} />
        <View style={[styles.bookedCircle, { width: 90, height: 90, bottom: -20, left: 20 }]} />
        <View style={styles.bookedCheckbox}>
          <Ionicons name="checkmark" size={38} color="#fff" />
        </View>
        <Text style={styles.bookedHeaderTitle}>Ride Confirmed!</Text>
        <Text style={styles.bookedHeaderSub}>Your {booked.type === "bike" ? "🏍️ bike" : "🚗 car"} is on the way</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.bookedContent}>
        {/* Driver Info */}
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarTxt}>{booked.type === "bike" ? "🏍" : "🚗"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>{booked.type === "bike" ? "Bike Rider" : "Car Driver"} Assigned</Text>
            <View style={styles.driverMeta}>
              <View style={styles.starRow}>
                {[1,2,3,4,5].map(s => <Ionicons key={s} name="star" size={12} color="#F59E0B" />)}
              </View>
              <Text style={styles.driverRating}>4.9 • 250+ trips</Text>
            </View>
            <Text style={styles.driverEta}>ETA: {booked.estimatedTime || "5–10 min"}</Text>
          </View>
          <View style={styles.driverActions}>
            <Pressable style={styles.driverActionBtn}>
              <Ionicons name="call-outline" size={20} color={C.primary} />
            </Pressable>
            <Pressable style={styles.driverActionBtn}>
              <Ionicons name="chatbubble-outline" size={20} color={C.primary} />
            </Pressable>
          </View>
        </View>

        {/* Route Card */}
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: C.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>Pickup</Text>
              <Text style={styles.routeVal}>{booked.pickupAddress}</Text>
            </View>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: C.danger }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>Drop</Text>
              <Text style={styles.routeVal}>{booked.dropAddress}</Text>
            </View>
          </View>
        </View>

        {/* Fare Summary */}
        <View style={styles.fareCard}>
          <Text style={styles.fareCardTitle}>Fare Summary</Text>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Vehicle</Text>
            <Text style={styles.fareVal}>{booked.type === "bike" ? "🏍️ Bike" : "🚗 Car"}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Distance</Text>
            <Text style={styles.fareVal}>{booked.distance} km</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Payment</Text>
            <Text style={styles.fareVal}>{booked.paymentMethod === "wallet" ? "💳 Wallet" : "💵 Cash"}</Text>
          </View>
          <View style={[styles.fareRow, styles.fareTotalRow]}>
            <Text style={styles.fareTotalLbl}>Total Fare</Text>
            <Text style={styles.fareTotalVal}>Rs. {booked.fare}</Text>
          </View>
        </View>

        {/* Ride ID */}
        <View style={styles.rideIdCard}>
          <Ionicons name="receipt-outline" size={16} color={C.textMuted} />
          <Text style={styles.rideIdTxt}>Ride ID: #{booked.id?.slice(-8).toUpperCase()}</Text>
        </View>

        {/* Buttons */}
        <View style={styles.bookedBtns}>
          <Pressable onPress={() => router.push("/")} style={styles.homeBtn}>
            <Ionicons name="home-outline" size={18} color={C.primary} />
            <Text style={styles.homeBtnTxt}>Home</Text>
          </Pressable>
          <Pressable onPress={onReset} style={styles.newRideBtn}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.newRideBtnTxt}>New Ride</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

/* ════════════════════════════════════ MAIN SCREEN ════════════════════════════════════ */
export default function RideScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [pickup, setPickup]     = useState("");
  const [drop,   setDrop]       = useState("");
  const [rideType, setRideType] = useState<RideType>("bike");
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [estimate, setEstimate] = useState<{ fare: number; distance: number; duration: string } | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [booked, setBooked] = useState<any>(null);
  const [showPickupSuggest, setShowPickupSuggest] = useState(false);
  const [showDropSuggest,   setShowDropSuggest]   = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleEstimate = async () => {
    if (!pickup || !drop) { Alert.alert("Required", "Enter both pickup and drop locations"); return; }
    setEstimating(true);
    setEstimate(null);
    try {
      const res = await estimateFare({ pickupLat: 33.7, pickupLng: 73.4, dropLat: 33.72, dropLng: 73.44, type: rideType });
      setEstimate(res);
    } catch { Alert.alert("Error", "Could not estimate fare. Please try again."); }
    setEstimating(false);
  };

  const handleBook = async () => {
    if (!user) { Alert.alert("Login Required", "Please login to book a ride"); return; }
    if (!pickup || !drop) { Alert.alert("Required", "Enter pickup and drop locations"); return; }
    if (payMethod === "wallet" && estimate && user.walletBalance < estimate.fare) {
      Alert.alert("Insufficient Balance", `Your wallet balance is Rs. ${user.walletBalance}. Please top up.`, [
        { text: "Cancel" },
        { text: "Top Up", onPress: () => router.push("/(tabs)/wallet") },
      ]);
      return;
    }
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
      Alert.alert("Booking Failed", e.message || "Could not book ride. Please try again.");
    }
    setLoading(false);
  };

  if (booked) {
    return <BookedScreen booked={booked} onReset={() => { setBooked(null); setPickup(""); setDrop(""); setEstimate(null); }} />;
  }

  const bikeFeatures = ["Rs.15 base + Rs.8/km", "Helmet included", "Fastest route", "Live tracking"];
  const carFeatures  = ["Rs.25 base + Rs.12/km", "AC available", "Up to 4 passengers", "Live tracking"];

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* HEADER */}
      <LinearGradient
        colors={["#065F46", "#059669", "#10B981"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 10 }]}
      >
        <View style={[styles.blob2, { width: 160, height: 160, top: -50, right: -40 }]} />
        <View style={styles.hdrRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.hdrTitle}>Book a Ride</Text>
            <Text style={styles.hdrSub}>AJK mein kahin bhi, kabhi bhi</Text>
          </View>
          <View style={styles.hdrIcon}>
            <Ionicons name="car" size={22} color="#fff" />
          </View>
        </View>

        {/* Location Inputs */}
        <View style={styles.locCard}>
          {/* Pickup */}
          <View style={styles.locRow}>
            <View style={styles.locGreen} />
            <TextInput
              style={styles.locInput}
              value={pickup}
              onChangeText={v => { setPickup(v); setShowPickupSuggest(v.length > 0); setEstimate(null); }}
              placeholder="Pickup location"
              placeholderTextColor={C.textMuted}
              onFocus={() => setShowPickupSuggest(true)}
              onBlur={() => setTimeout(() => setShowPickupSuggest(false), 150)}
            />
            {pickup.length > 0 && (
              <Pressable onPress={() => { setPickup(""); setEstimate(null); }}>
                <Ionicons name="close-circle" size={16} color={C.textMuted} />
              </Pressable>
            )}
          </View>

          {showPickupSuggest && (
            <View style={styles.suggestBox}>
              {POPULAR_LOCS.filter(l => !pickup || l.toLowerCase().includes(pickup.toLowerCase())).map(loc => (
                <Pressable key={loc} onPress={() => { setPickup(loc); setShowPickupSuggest(false); }} style={styles.suggestRow}>
                  <Ionicons name="location-outline" size={14} color={C.primary} />
                  <Text style={styles.suggestTxt}>{loc}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.locSep}>
            <View style={styles.locSepLine} />
            <Pressable onPress={() => { const t = pickup; setPickup(drop); setDrop(t); setEstimate(null); }} style={styles.swapBtn}>
              <Ionicons name="swap-vertical" size={14} color={C.primary} />
            </Pressable>
            <View style={styles.locSepLine} />
          </View>

          {/* Drop */}
          <View style={styles.locRow}>
            <View style={styles.locRed} />
            <TextInput
              style={styles.locInput}
              value={drop}
              onChangeText={v => { setDrop(v); setShowDropSuggest(v.length > 0); setEstimate(null); }}
              placeholder="Drop location"
              placeholderTextColor={C.textMuted}
              onFocus={() => setShowDropSuggest(true)}
              onBlur={() => setTimeout(() => setShowDropSuggest(false), 150)}
            />
            {drop.length > 0 && (
              <Pressable onPress={() => { setDrop(""); setEstimate(null); }}>
                <Ionicons name="close-circle" size={16} color={C.textMuted} />
              </Pressable>
            )}
          </View>

          {showDropSuggest && (
            <View style={styles.suggestBox}>
              {POPULAR_LOCS.filter(l => !drop || l.toLowerCase().includes(drop.toLowerCase())).map(loc => (
                <Pressable key={loc} onPress={() => { setDrop(loc); setShowDropSuggest(false); }} style={styles.suggestRow}>
                  <Ionicons name="location-outline" size={14} color={C.danger} />
                  <Text style={styles.suggestTxt}>{loc}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Popular Locations */}
        <View style={styles.secRow}>
          <Text style={styles.secTitle}>Popular Locations</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popRow}>
          {POPULAR_LOCS.map(loc => (
            <Pressable key={loc} onPress={() => { if (!pickup) setPickup(loc); else if (!drop) setDrop(loc); setEstimate(null); }} style={styles.popChip}>
              <Ionicons name="location-outline" size={13} color={C.primary} />
              <Text style={styles.popChipTxt}>{loc}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Vehicle Selection */}
        <View style={styles.secRow}>
          <Text style={styles.secTitle}>Choose Vehicle</Text>
          {estimate && (
            <View style={styles.estimateBadge}>
              <Ionicons name="pricetag-outline" size={12} color={C.success} />
              <Text style={styles.estimateBadgeTxt}>Fare estimated</Text>
            </View>
          )}
        </View>

        <View style={styles.vehicleRow}>
          {/* BIKE */}
          <Pressable onPress={() => { setRideType("bike"); setEstimate(null); }} style={[styles.vehicleCard, rideType === "bike" && styles.vehicleCardActive]}>
            {rideType === "bike" && (
              <LinearGradient colors={["#059669", "#10B981"]} style={styles.vehicleActiveBg} />
            )}
            <View style={[styles.vehicleIcon, { backgroundColor: rideType === "bike" ? "rgba(255,255,255,0.2)" : "#DCFCE7" }]}>
              <Ionicons name="bicycle" size={30} color={rideType === "bike" ? "#fff" : "#059669"} />
            </View>
            <Text style={[styles.vehicleTitle, rideType === "bike" && { color: "#fff" }]}>Bike</Text>
            <Text style={[styles.vehicleSub, rideType === "bike" && { color: "rgba(255,255,255,0.8)" }]}>From Rs. 50</Text>
            <View style={styles.vehicleFeatures}>
              {bikeFeatures.map(f => (
                <View key={f} style={styles.vehicleFeatureRow}>
                  <Ionicons name="checkmark-circle" size={12} color={rideType === "bike" ? "rgba(255,255,255,0.8)" : C.success} />
                  <Text style={[styles.vehicleFeatureTxt, rideType === "bike" && { color: "rgba(255,255,255,0.85)" }]}>{f}</Text>
                </View>
              ))}
            </View>
          </Pressable>

          {/* CAR */}
          <Pressable onPress={() => { setRideType("car"); setEstimate(null); }} style={[styles.vehicleCard, rideType === "car" && styles.vehicleCardActive]}>
            {rideType === "car" && (
              <LinearGradient colors={["#059669", "#10B981"]} style={styles.vehicleActiveBg} />
            )}
            <View style={[styles.vehicleIcon, { backgroundColor: rideType === "car" ? "rgba(255,255,255,0.2)" : "#DCFCE7" }]}>
              <Ionicons name="car" size={30} color={rideType === "car" ? "#fff" : "#059669"} />
            </View>
            <Text style={[styles.vehicleTitle, rideType === "car" && { color: "#fff" }]}>Car</Text>
            <Text style={[styles.vehicleSub, rideType === "car" && { color: "rgba(255,255,255,0.8)" }]}>From Rs. 100</Text>
            <View style={styles.vehicleFeatures}>
              {carFeatures.map(f => (
                <View key={f} style={styles.vehicleFeatureRow}>
                  <Ionicons name="checkmark-circle" size={12} color={rideType === "car" ? "rgba(255,255,255,0.8)" : C.success} />
                  <Text style={[styles.vehicleFeatureTxt, rideType === "car" && { color: "rgba(255,255,255,0.85)" }]}>{f}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        </View>

        {/* Fare Estimate Card */}
        {estimate && (
          <View style={styles.fareEstCard}>
            <LinearGradient colors={["#F0FDF4", "#DCFCE7"]} style={styles.fareEstInner}>
              <View style={styles.fareEstHeader}>
                <Ionicons name="pricetag" size={18} color="#059669" />
                <Text style={styles.fareEstTitle}>Fare Estimate</Text>
              </View>
              <View style={styles.fareEstRow}>
                <View style={styles.fareEstItem}>
                  <Text style={styles.fareEstLbl}>Distance</Text>
                  <Text style={styles.fareEstVal}>{estimate.distance} km</Text>
                </View>
                <View style={styles.fareEstDivider} />
                <View style={styles.fareEstItem}>
                  <Text style={styles.fareEstLbl}>Duration</Text>
                  <Text style={styles.fareEstVal}>{estimate.duration}</Text>
                </View>
                <View style={styles.fareEstDivider} />
                <View style={styles.fareEstItem}>
                  <Text style={styles.fareEstLbl}>Total Fare</Text>
                  <Text style={[styles.fareEstVal, { color: "#059669", fontSize: 18 }]}>Rs. {estimate.fare}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Payment Method */}
        <View style={styles.secRow}>
          <Text style={styles.secTitle}>Payment</Text>
        </View>
        <View style={styles.payRow}>
          <Pressable onPress={() => setPayMethod("cash")} style={[styles.payCard, payMethod === "cash" && styles.payCardActive]}>
            <View style={[styles.payIconBox, { backgroundColor: payMethod === "cash" ? "#D1FAE5" : C.surfaceSecondary }]}>
              <Ionicons name="cash-outline" size={22} color={payMethod === "cash" ? C.success : C.textSecondary} />
            </View>
            <Text style={[styles.payLbl, payMethod === "cash" && styles.payLblActive]}>Cash</Text>
            <Text style={styles.paySub}>Pay on arrival</Text>
            {payMethod === "cash" && <View style={styles.payCheck}><Ionicons name="checkmark" size={12} color="#fff" /></View>}
          </Pressable>

          <Pressable onPress={() => setPayMethod("wallet")} style={[styles.payCard, payMethod === "wallet" && styles.payCardActive]}>
            <View style={[styles.payIconBox, { backgroundColor: payMethod === "wallet" ? "#DBEAFE" : C.surfaceSecondary }]}>
              <Ionicons name="wallet-outline" size={22} color={payMethod === "wallet" ? C.primary : C.textSecondary} />
            </View>
            <Text style={[styles.payLbl, payMethod === "wallet" && styles.payLblActive]}>Wallet</Text>
            <Text style={[styles.paySub, (user?.walletBalance || 0) < (estimate?.fare || 0) && { color: C.danger }]}>
              Rs. {user?.walletBalance?.toLocaleString() || 0}
            </Text>
            {payMethod === "wallet" && <View style={[styles.payCheck, { backgroundColor: C.primary }]}><Ionicons name="checkmark" size={12} color="#fff" /></View>}
          </Pressable>
        </View>

        {/* Safety info */}
        <View style={styles.safetyCard}>
          <Ionicons name="shield-checkmark-outline" size={16} color={C.success} />
          <Text style={styles.safetyTxt}>All rides are insured • Drivers are verified • GPS tracked</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable onPress={handleEstimate} disabled={estimating} style={styles.estimateBtn}>
            {estimating ? (
              <ActivityIndicator color={C.primary} size="small" />
            ) : (
              <>
                <Ionicons name="calculator-outline" size={17} color={C.primary} />
                <Text style={styles.estimateBtnTxt}>Get Estimate</Text>
              </>
            )}
          </Pressable>
          <Pressable onPress={handleBook} disabled={loading} style={[styles.bookBtn, loading && { opacity: 0.7 }]}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="car-outline" size={18} color="#fff" />
                <Text style={styles.bookBtnTxt}>Book Now</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={{ height: Platform.OS === "web" ? 34 : 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* header */
  header: { paddingHorizontal: 16, paddingBottom: 16, overflow: "hidden" },
  hdrRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  hdrTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff" },
  hdrSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.8)" },
  hdrIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  blob2: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" },

  /* location card */
  locCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  locGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#10B981", borderWidth: 2, borderColor: "#D1FAE5" },
  locRed:   { width: 12, height: 12, borderRadius: 6, backgroundColor: C.danger,   borderWidth: 2, borderColor: "#FEE2E2" },
  locInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: C.text, paddingVertical: 8 },
  locSep: { flexDirection: "row", alignItems: "center", marginVertical: 4, marginLeft: 5, gap: 8 },
  locSepLine: { flex: 1, height: 1, backgroundColor: C.borderLight },
  swapBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },

  /* suggestions */
  suggestBox: { backgroundColor: "#F8FAFC", borderRadius: 10, marginTop: 4, borderWidth: 1, borderColor: C.borderLight, overflow: "hidden" },
  suggestRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  suggestTxt: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.text },

  /* section */
  secRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 20, marginBottom: 12 },
  secTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: C.text },
  estimateBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  estimateBadgeTxt: { fontFamily: "Inter_500Medium", fontSize: 11, color: C.success },

  /* popular locations */
  popRow: { paddingHorizontal: 16, gap: 8 },
  popChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE" },
  popChipTxt: { fontFamily: "Inter_500Medium", fontSize: 12, color: C.primary },

  /* vehicle selection */
  vehicleRow: { flexDirection: "row", paddingHorizontal: 16, gap: 12 },
  vehicleCard: {
    flex: 1, borderRadius: 18, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surface, padding: 16, alignItems: "center", gap: 6, overflow: "hidden",
  },
  vehicleCardActive: { borderColor: "#10B981" },
  vehicleActiveBg: { ...StyleSheet.absoluteFillObject, borderRadius: 16 },
  vehicleIcon: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  vehicleTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: C.text },
  vehicleSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted, marginBottom: 8 },
  vehicleFeatures: { width: "100%", gap: 5 },
  vehicleFeatureRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  vehicleFeatureTxt: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textSecondary, flex: 1 },

  /* fare estimate */
  fareEstCard: { marginHorizontal: 16, marginTop: 8, borderRadius: 16, overflow: "hidden", borderWidth: 1.5, borderColor: "#A7F3D0" },
  fareEstInner: { borderRadius: 16, padding: 16 },
  fareEstHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  fareEstTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#065F46" },
  fareEstRow: { flexDirection: "row", justifyContent: "space-between" },
  fareEstItem: { flex: 1, alignItems: "center", gap: 4 },
  fareEstDivider: { width: 1, backgroundColor: "#A7F3D0" },
  fareEstLbl: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#047857" },
  fareEstVal: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#065F46" },

  /* payment */
  payRow: { flexDirection: "row", paddingHorizontal: 16, gap: 12 },
  payCard: {
    flex: 1, borderRadius: 16, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surface, padding: 14, alignItems: "center", gap: 6, position: "relative",
  },
  payCardActive: { borderColor: C.primary, backgroundColor: "#F0F7FF" },
  payIconBox: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  payLbl: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.textSecondary },
  payLblActive: { color: C.text },
  paySub: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
  payCheck: { position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: C.success, alignItems: "center", justifyContent: "center" },

  /* safety */
  safetyCard: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginTop: 16, backgroundColor: "#F0FDF4", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#A7F3D0" },
  safetyTxt: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#047857", flex: 1 },

  /* action buttons */
  scrollContent: { paddingBottom: 20 },
  actionRow: { flexDirection: "row", paddingHorizontal: 16, gap: 12, marginTop: 20 },
  estimateBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: C.primary, borderRadius: 16, paddingVertical: 15, backgroundColor: "#EFF6FF" },
  estimateBtnTxt: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.primary },
  bookBtn: { flex: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#059669", borderRadius: 16, paddingVertical: 15 },
  bookBtnTxt: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },

  /* booked confirmation */
  bookedHeader: { paddingHorizontal: 24, paddingBottom: 32, alignItems: "center", overflow: "hidden" },
  bookedCircle: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.1)" },
  bookedCheckbox: { width: 80, height: 80, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", borderWidth: 2.5, borderColor: "rgba(255,255,255,0.5)", marginBottom: 14 },
  bookedHeaderTitle: { fontFamily: "Inter_700Bold", fontSize: 28, color: "#fff", marginBottom: 6 },
  bookedHeaderSub: { fontFamily: "Inter_400Regular", fontSize: 15, color: "rgba(255,255,255,0.88)" },
  bookedContent: { paddingHorizontal: 16, paddingTop: 16 },
  driverCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.surface, borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  driverAvatar: { width: 54, height: 54, borderRadius: 16, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  driverAvatarTxt: { fontSize: 28 },
  driverName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.text, marginBottom: 4 },
  driverMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  starRow: { flexDirection: "row" },
  driverRating: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },
  driverEta: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#059669" },
  driverActions: { gap: 8 },
  driverActionBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  routeCard: { backgroundColor: C.surface, borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  routeDot: { width: 14, height: 14, borderRadius: 7, marginTop: 3 },
  routeLine: { width: 2, height: 20, backgroundColor: C.borderLight, marginLeft: 6, marginVertical: 5 },
  routeLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted, marginBottom: 2 },
  routeVal: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.text },
  fareCard: { backgroundColor: C.surface, borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  fareCardTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: C.text, marginBottom: 14 },
  fareRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  fareTotalRow: { borderBottomWidth: 0, marginTop: 6, paddingTop: 12, borderTopWidth: 2, borderTopColor: C.border },
  fareLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textSecondary },
  fareVal: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.text },
  fareTotalLbl: { fontFamily: "Inter_700Bold", fontSize: 16, color: C.text },
  fareTotalVal: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#059669" },
  rideIdCard: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 20 },
  rideIdTxt: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },
  bookedBtns: { flexDirection: "row", gap: 12 },
  homeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: C.primary, borderRadius: 16, paddingVertical: 15, backgroundColor: "#EFF6FF" },
  homeBtnTxt: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.primary },
  newRideBtn: { flex: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#059669", borderRadius: 16, paddingVertical: 15 },
  newRideBtnTxt: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
});
