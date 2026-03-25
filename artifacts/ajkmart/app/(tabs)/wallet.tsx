import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
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

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

function TransactionItem({ tx }: { tx: any }) {
  const isCredit = tx.type === "credit";
  const date = new Date(tx.createdAt).toLocaleDateString("en-PK", {
    day: "numeric", month: "short", year: "numeric",
  });
  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: isCredit ? "#D1FAE5" : "#FEE2E2" }]}>
        <Ionicons
          name={isCredit ? "arrow-down-outline" : "arrow-up-outline"}
          size={17}
          color={isCredit ? C.success : C.danger}
        />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txDesc}>{tx.description}</Text>
        <Text style={styles.txDate}>{date}</Text>
      </View>
      <Text style={[styles.txAmt, { color: isCredit ? C.success : C.danger }]}>
        {isCredit ? "+" : "−"}Rs. {Number(tx.amount).toLocaleString()}
      </Text>
    </View>
  );
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [showTopUp, setShowTopUp] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useGetWallet(
    { userId: user?.id || "" },
    { query: { enabled: !!user?.id } }
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const res = await refetch();
    if (res.data?.balance !== undefined) {
      updateUser({ walletBalance: res.data.balance });
    }
    setRefreshing(false);
  }, [refetch, updateUser]);

  const handleTopUp = async () => {
    const num = parseFloat(amount);
    if (!num || num < 100) {
      Alert.alert("Invalid Amount", "Minimum top-up amount is Rs. 100");
      return;
    }
    if (num > 50000) {
      Alert.alert("Limit Exceeded", "Maximum single top-up is Rs. 50,000");
      return;
    }
    setLoading(true);
    try {
      const result = await topUpWallet({ userId: user!.id, amount: num });
      const newBalance = (result as any)?.balance ?? (user!.walletBalance + num);
      updateUser({ walletBalance: newBalance });
      qc.invalidateQueries({ queryKey: ["getWallet"] });
      setShowTopUp(false);
      setAmount("");
      Alert.alert("✅ Top-Up Successful", `Rs. ${num.toLocaleString()} added to your wallet!`);
    } catch {
      Alert.alert("Top-Up Failed", "Could not process your request. Please try again.");
    }
    setLoading(false);
  };

  const balance = data?.balance ?? user?.walletBalance ?? 0;
  const transactions = data?.transactions ?? [];
  const totalIn = transactions.filter(t => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = transactions.filter(t => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        {/* Balance Card */}
        <LinearGradient
          colors={["#0F3BA8", C.primary, "#2563EB"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.balanceCard, { paddingTop: topPad + 20 }]}
        >
          <View style={[styles.circle, { width: 200, height: 200, top: -60, right: -60 }]} />
          <View style={[styles.circle, { width: 100, height: 100, bottom: -20, left: 30 }]} />

          <Text style={styles.balLabel}>AJKMart Wallet</Text>
          <Text style={styles.balAmount}>
            {isLoading ? "Rs. ···" : `Rs. ${balance.toLocaleString()}`}
          </Text>
          <Text style={styles.balSub}>Available Balance</Text>

          <View style={styles.walActions}>
            <Pressable onPress={() => setShowTopUp(true)} style={styles.walAction}>
              <View style={styles.walActionIcon}>
                <Ionicons name="add" size={22} color={C.primary} />
              </View>
              <Text style={styles.walActionText}>Top Up</Text>
            </Pressable>
            <Pressable style={styles.walAction}>
              <View style={styles.walActionIcon}>
                <Ionicons name="send-outline" size={20} color={C.primary} />
              </View>
              <Text style={styles.walActionText}>Send</Text>
            </Pressable>
            <Pressable style={styles.walAction}>
              <View style={styles.walActionIcon}>
                <Ionicons name="qr-code-outline" size={20} color={C.primary} />
              </View>
              <Text style={styles.walActionText}>Scan & Pay</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#D1FAE5" }]}>
              <Ionicons name="arrow-down-outline" size={18} color={C.success} />
            </View>
            <Text style={styles.statLabel}>Total In</Text>
            <Text style={[styles.statAmt, { color: C.success }]}>Rs. {totalIn.toLocaleString()}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="arrow-up-outline" size={18} color={C.danger} />
            </View>
            <Text style={styles.statLabel}>Total Out</Text>
            <Text style={[styles.statAmt, { color: C.danger }]}>Rs. {totalOut.toLocaleString()}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#DBEAFE" }]}>
              <Ionicons name="receipt-outline" size={18} color={C.primary} />
            </View>
            <Text style={styles.statLabel}>Transactions</Text>
            <Text style={[styles.statAmt, { color: C.primary }]}>{transactions.length}</Text>
          </View>
        </View>

        {/* Transactions */}
        <View style={styles.txSection}>
          <Text style={styles.txTitle}>Transaction History</Text>
          {isLoading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
          ) : transactions.length === 0 ? (
            <View style={styles.emptyTx}>
              <Ionicons name="receipt-outline" size={48} color={C.border} />
              <Text style={styles.emptyTxTitle}>No transactions yet</Text>
              <Text style={styles.emptyTxText}>Top up your wallet to get started</Text>
            </View>
          ) : (
            <View style={styles.txList}>
              {[...transactions].reverse().map(tx => (
                <TransactionItem key={tx.id} tx={tx} />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: Platform.OS === "web" ? 50 : 30 }} />
      </ScrollView>

      {/* Top-Up Modal */}
      <Modal
        visible={showTopUp}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTopUp(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowTopUp(false)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add Money to Wallet</Text>

            <Text style={styles.sheetLabel}>Amount (PKR)</Text>
            <View style={styles.amtInputWrap}>
              <Text style={styles.rupeeSign}>Rs.</Text>
              <TextInput
                style={styles.amtInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={C.textMuted}
                autoFocus
              />
            </View>

            <Text style={styles.sheetLabel}>Quick Select</Text>
            <View style={styles.quickAmts}>
              {QUICK_AMOUNTS.map(a => (
                <Pressable
                  key={a}
                  onPress={() => setAmount(a.toString())}
                  style={[styles.quickAmt, amount === a.toString() && styles.quickAmtActive]}
                >
                  <Text style={[styles.quickAmtText, amount === a.toString() && styles.quickAmtTextActive]}>
                    Rs. {a.toLocaleString()}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.sheetNote}>
              <Ionicons name="shield-checkmark-outline" size={14} color={C.success} />
              <Text style={styles.sheetNoteText}>Secure payment • Instant credit</Text>
            </View>

            <Pressable
              onPress={handleTopUp}
              disabled={loading || !amount}
              style={[styles.topUpBtn, (loading || !amount) && styles.topUpBtnDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.topUpBtnText}>
                    Add Rs. {parseFloat(amount || "0").toLocaleString()}
                  </Text>
                </>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  balanceCard: { paddingHorizontal: 20, paddingBottom: 28, overflow: "hidden" },
  balLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 6 },
  balAmount: { fontFamily: "Inter_700Bold", fontSize: 40, color: "#fff", marginBottom: 2 },
  balSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 24 },
  walActions: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 18, padding: 16, gap: 4,
  },
  walAction: { flex: 1, alignItems: "center", gap: 8 },
  walActionIcon: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
  },
  walActionText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "#fff" },
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginTop: 16 },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 16,
    padding: 14, alignItems: "center", gap: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
  statAmt: { fontFamily: "Inter_700Bold", fontSize: 14 },
  txSection: { paddingHorizontal: 16, marginTop: 24 },
  txTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: C.text, marginBottom: 14 },
  txList: {},
  txRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  txInfo: { flex: 1 },
  txDesc: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.text },
  txDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted, marginTop: 2 },
  txAmt: { fontFamily: "Inter_700Bold", fontSize: 15 },
  emptyTx: { alignItems: "center", gap: 10, paddingVertical: 40 },
  emptyTxTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: C.text },
  emptyTxText: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.textMuted },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: Platform.OS === "web" ? 40 : 48,
    paddingTop: 12,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.text, marginBottom: 20 },
  sheetLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.textSecondary, marginBottom: 8 },
  amtInputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 14, paddingHorizontal: 16,
    marginBottom: 20,
  },
  rupeeSign: { fontFamily: "Inter_600SemiBold", fontSize: 22, color: C.textSecondary, marginRight: 6 },
  amtInput: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 28, color: C.text, paddingVertical: 14 },
  quickAmts: { flexDirection: "row", gap: 8, marginBottom: 16 },
  quickAmt: {
    flex: 1, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingVertical: 11, alignItems: "center",
    backgroundColor: C.surface,
  },
  quickAmtActive: { borderColor: C.primary, backgroundColor: "#EFF6FF" },
  quickAmtText: { fontFamily: "Inter_500Medium", fontSize: 12, color: C.textSecondary },
  quickAmtTextActive: { color: C.primary, fontFamily: "Inter_700Bold" },
  sheetNote: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 },
  sheetNoteText: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },
  topUpBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16,
  },
  topUpBtnDisabled: { opacity: 0.5 },
  topUpBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  circle: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" },
});
