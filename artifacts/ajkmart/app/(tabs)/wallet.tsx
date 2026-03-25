import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
import { useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useGetWallet, topUpWallet } from "@workspace/api-client-react";

const C = Colors.light;

function TransactionItem({ tx }: { tx: any }) {
  const isCredit = tx.type === "credit";
  return (
    <View style={styles.txItem}>
      <View style={[styles.txIcon, { backgroundColor: isCredit ? "#D1FAE5" : "#FEE2E2" }]}>
        <Ionicons name={isCredit ? "arrow-down-outline" : "arrow-up-outline"} size={18} color={isCredit ? C.success : C.danger} />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txDesc}>{tx.description}</Text>
        <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</Text>
      </View>
      <Text style={[styles.txAmount, { color: isCredit ? C.success : C.danger }]}>
        {isCredit ? "+" : "-"}Rs. {tx.amount}
      </Text>
    </View>
  );
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const [showTopUp, setShowTopUp] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading } = useGetWallet(
    { userId: user?.id || "" },
    { query: { enabled: !!user?.id } }
  );

  const handleTopUp = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) { Alert.alert("Error", "Enter a valid amount"); return; }
    setLoading(true);
    try {
      await topUpWallet({ userId: user!.id, amount: num });
      updateUser({ walletBalance: (user?.walletBalance || 0) + num });
      qc.invalidateQueries({ queryKey: ["getWallet"] });
      setShowTopUp(false);
      setAmount("");
    } catch { Alert.alert("Error", "Top-up failed"); }
    setLoading(false);
  };

  const quickAmounts = [500, 1000, 2000, 5000];

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.headerTitle}>My Wallet</Text>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[C.primaryDark, C.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            Rs. {isLoading ? "..." : (data?.balance || user?.walletBalance || 0).toLocaleString()}
          </Text>
          <View style={styles.walletActions}>
            <Pressable onPress={() => setShowTopUp(true)} style={styles.walletAction}>
              <Ionicons name="add-circle-outline" size={22} color="#fff" />
              <Text style={styles.walletActionText}>Top Up</Text>
            </Pressable>
            <View style={styles.walletDivider} />
            <Pressable style={styles.walletAction}>
              <Ionicons name="send-outline" size={22} color="#fff" />
              <Text style={styles.walletActionText}>Send</Text>
            </Pressable>
            <View style={styles.walletDivider} />
            <Pressable style={styles.walletAction}>
              <Ionicons name="qr-code-outline" size={22} color="#fff" />
              <Text style={styles.walletActionText}>Pay</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="arrow-down-outline" size={20} color={C.success} />
            <Text style={styles.statLabel}>Total In</Text>
            <Text style={[styles.statValue, { color: C.success }]}>
              Rs. {(data?.transactions?.filter(t => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0) || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="arrow-up-outline" size={20} color={C.danger} />
            <Text style={styles.statLabel}>Total Out</Text>
            <Text style={[styles.statValue, { color: C.danger }]}>
              Rs. {(data?.transactions?.filter(t => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0) || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="receipt-outline" size={20} color={C.primary} />
            <Text style={styles.statLabel}>Transactions</Text>
            <Text style={[styles.statValue, { color: C.primary }]}>{data?.transactions?.length || 0}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Transaction History</Text>

        {isLoading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
        ) : !data?.transactions?.length ? (
          <View style={styles.emptyTx}>
            <Ionicons name="receipt-outline" size={48} color={C.border} />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {[...data.transactions].reverse().map(tx => (
              <TransactionItem key={tx.id} tx={tx} />
            ))}
          </View>
        )}

        <View style={{ height: Platform.OS === "web" ? 34 : 20 }} />
      </ScrollView>

      <Modal visible={showTopUp} transparent animationType="slide" onRequestClose={() => setShowTopUp(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowTopUp(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Money to Wallet</Text>
            <Text style={styles.modalLabel}>Enter Amount (PKR)</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={C.textMuted}
            />
            <Text style={styles.modalLabel}>Quick Select</Text>
            <View style={styles.quickAmounts}>
              {quickAmounts.map(a => (
                <Pressable key={a} onPress={() => setAmount(a.toString())} style={[styles.quickAmt, amount === a.toString() && styles.quickAmtActive]}>
                  <Text style={[styles.quickAmtText, amount === a.toString() && styles.quickAmtTextActive]}>Rs. {a.toLocaleString()}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={handleTopUp} style={[styles.topUpBtn, loading && styles.topUpBtnDisabled]} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.topUpBtnText}>Add Rs. {parseFloat(amount || "0").toLocaleString()}</Text>}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: C.text },
  balanceCard: { margin: 16, borderRadius: 20, padding: 24 },
  balanceLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 4 },
  balanceAmount: { fontFamily: "Inter_700Bold", fontSize: 36, color: "#fff", marginBottom: 24 },
  walletActions: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14, padding: 14 },
  walletAction: { flex: 1, alignItems: "center", gap: 6 },
  walletDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  walletActionText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "#fff" },
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10 },
  statCard: { flex: 1, backgroundColor: C.surface, borderRadius: 14, padding: 14, alignItems: "center", gap: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 14 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: C.text, marginHorizontal: 16, marginTop: 24, marginBottom: 12 },
  txList: { paddingHorizontal: 16 },
  txItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  txInfo: { flex: 1 },
  txDesc: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.text },
  txDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted, marginTop: 2 },
  txAmount: { fontFamily: "Inter_700Bold", fontSize: 15 },
  emptyTx: { alignItems: "center", gap: 10, paddingVertical: 40 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textMuted },
  modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: "flex-end" },
  modalSheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.text, marginBottom: 20 },
  modalLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.textSecondary, marginBottom: 8 },
  amountInput: { borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontFamily: "Inter_600SemiBold", fontSize: 24, color: C.text, marginBottom: 16 },
  quickAmounts: { flexDirection: "row", gap: 8, marginBottom: 24 },
  quickAmt: { flex: 1, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  quickAmtActive: { borderColor: C.primary, backgroundColor: C.rideLight },
  quickAmtText: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.textSecondary },
  quickAmtTextActive: { color: C.primary },
  topUpBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  topUpBtnDisabled: { opacity: 0.7 },
  topUpBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
});
