import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { sendOtp, verifyOtp } from "@workspace/api-client-react";

const C = Colors.light;

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const slideAnim = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { config: platformCfg } = usePlatformConfig();
  const appName = platformCfg.platform.appName;

  const handleSendOtp = async () => {
    setError("");
    if (!phone || phone.length < 10) {
      setError("Valid phone number enter karein (10 digits)");
      return;
    }
    setLoading(true);
    try {
      const res = await sendOtp({ phone });
      if (res.otp) setDevOtp(res.otp); // show OTP inline in dev mode
      Animated.timing(slideAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      setStep("otp");
    } catch {
      setError("OTP send nahi ho saka. Dobara try karein.");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    setError("");
    if (!otp || otp.length < 4) {
      setError("OTP enter karein jo aapko mila");
      return;
    }
    setLoading(true);
    try {
      const res = await verifyOtp({ phone, otp });
      await login(res.user as any, res.token);
      router.replace("/(tabs)");
    } catch {
      setError("OTP galat hai. Dobara try karein.");
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <LinearGradient colors={[C.primaryDark, C.primary, "#60A5FA"]} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.gradient}>
        <View style={[styles.topSection, { paddingTop: topPad + 40 }]}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Ionicons name="cart" size={40} color={C.primary} />
            </View>
          </View>
          <Text style={styles.appName}>{appName}</Text>
          <Text style={styles.tagline}>Your super app for everything</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {step === "phone" ? "Enter your phone number" : "Verify OTP"}
          </Text>
          <Text style={styles.cardSubtitle}>
            {step === "phone"
              ? "We'll send you a verification code"
              : `Code sent to +92 ${phone.slice(-10)}`}
          </Text>

          {step === "phone" ? (
            <View style={styles.inputWrapper}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+92</Text>
              </View>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={v => { setPhone(v); setError(""); }}
                placeholder="3XX XXX XXXX"
                placeholderTextColor={C.textMuted}
                keyboardType="phone-pad"
                maxLength={11}
              />
            </View>
          ) : (
            <View>
              <TextInput
                style={[styles.input, styles.otpInput, error ? styles.inputError : null]}
                value={otp}
                onChangeText={v => { setOtp(v); setError(""); }}
                placeholder="Enter 6-digit OTP"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              {devOtp ? (
                <View style={styles.devOtpBox}>
                  <Ionicons name="key-outline" size={14} color="#059669" />
                  <Text style={styles.devOtpTxt}>Dev Mode — OTP: <Text style={{ fontFamily: "Inter_700Bold", letterSpacing: 4 }}>{devOtp}</Text></Text>
                </View>
              ) : null}
              <Pressable onPress={handleSendOtp} style={styles.resendBtn}>
                <Text style={styles.resendText}>Resend OTP</Text>
              </Pressable>
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
              <Text style={styles.errorTxt}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={step === "phone" ? handleSendOtp : handleVerifyOtp}
            style={[styles.btn, loading && styles.btnDisabled]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>
                {step === "phone" ? "Get OTP" : "Verify & Continue"}
              </Text>
            )}
          </Pressable>

          {step === "otp" && (
            <Pressable onPress={() => { setStep("phone"); setError(""); setDevOtp(""); }} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={16} color={C.primary} />
              <Text style={styles.backBtnText}>Change number</Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.footerText}>By continuing, you agree to our Terms & Privacy Policy</Text>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  topSection: { alignItems: "center", paddingBottom: 40 },
  logoContainer: { marginBottom: 16 },
  logo: { width: 80, height: 80, borderRadius: 24, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  appName: { fontFamily: "Inter_700Bold", fontSize: 36, color: "#fff", marginBottom: 8 },
  tagline: { fontFamily: "Inter_400Regular", fontSize: 16, color: "rgba(255,255,255,0.85)" },
  card: { backgroundColor: "#fff", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 28, flex: 1 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.text, marginBottom: 6 },
  cardSubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textSecondary, marginBottom: 24 },
  inputWrapper: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, overflow: "hidden", marginBottom: 8 },
  countryCode: { paddingHorizontal: 14, paddingVertical: 16, backgroundColor: C.surfaceSecondary, borderRightWidth: 1, borderRightColor: C.border },
  countryCodeText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: C.text },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 16, fontFamily: "Inter_500Medium", fontSize: 16, color: C.text },
  otpInput: { borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 8, letterSpacing: 6, textAlign: "center", fontSize: 22 },
  inputError: { borderColor: "#EF4444" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF2F2", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: "#FECACA" },
  errorTxt: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#DC2626", flex: 1 },
  devOtpBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ECFDF5", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, borderWidth: 1, borderColor: "#A7F3D0" },
  devOtpTxt: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#059669", flex: 1 },
  btn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 17, alignItems: "center", marginTop: 8 },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  resendBtn: { alignItems: "center", marginBottom: 8 },
  resendText: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.primary },
  backBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16 },
  backBtnText: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.primary },
  footer: { backgroundColor: "#fff", paddingHorizontal: 24, paddingTop: 16, alignItems: "center" },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted, textAlign: "center" },
});
