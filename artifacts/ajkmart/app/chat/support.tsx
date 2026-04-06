import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { T as Typ, Font } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";
import { useSmartBack } from "@/hooks/useSmartBack";
import { usePlatformConfig } from "@/context/PlatformConfigContext";

const C = Colors.light;

interface Message {
  id: string;
  text: string;
  sender: "user" | "support";
  timestamp: number;
}

const QUICK_REPLIES = [
  "Where is my order?",
  "I want to cancel my order",
  "I have a payment issue",
  "My item was wrong",
  "I need a refund",
];

const AUTO_RESPONSES: Record<string, string> = {
  "where is my order": "Your order is being processed. You can track it in the Orders tab. Typical delivery is 25-45 minutes.",
  "cancel": "To cancel an order, go to the Orders tab and tap on your active order. Cancellations are available within 2 minutes of placing the order.",
  "payment": "For payment issues, please ensure your wallet has sufficient balance. If the problem persists, our team will get back to you within 24 hours.",
  "wrong": "We're sorry about that! Please take a photo of the incorrect item and our support team will arrange a replacement or refund.",
  "refund": "Refunds are processed within 3-5 business days to your original payment method or wallet. You'll receive a notification when it's done.",
};

function getAutoReply(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [key, reply] of Object.entries(AUTO_RESPONSES)) {
    if (lower.includes(key)) return reply;
  }
  return null;
}

export default function SupportChatScreen() {
  const insets = useSafeAreaInsets();
  const { goBack } = useSmartBack();
  const { user } = useAuth();
  const { config } = usePlatformConfig();

  const userId = user?.id ?? "guest";
  const MESSAGES_KEY = `support_chat_messages:${userId}`;
  const DRAFT_KEY = `support_chat_draft:${userId}`;

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const hydratedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (hydratedKeyRef.current === MESSAGES_KEY) return;

    setLoading(true);
    setMessages([]);
    setDraft("");

    let cancelled = false;
    (async () => {
      try {
        const [savedMessages, savedDraft] = await Promise.all([
          AsyncStorage.getItem(MESSAGES_KEY),
          AsyncStorage.getItem(DRAFT_KEY),
        ]);
        if (cancelled) return;
        if (savedMessages) {
          setMessages(JSON.parse(savedMessages));
        } else {
          const welcome: Message = {
            id: `msg_${Date.now()}`,
            text: config.content.supportMsg || `Hi! Welcome to ${config.platform.appName} support. How can we help you today?`,
            sender: "support",
            timestamp: Date.now(),
          };
          setMessages([welcome]);
        }
        if (savedDraft) setDraft(savedDraft);
        hydratedKeyRef.current = MESSAGES_KEY;
      } catch {
        if (!cancelled) hydratedKeyRef.current = MESSAGES_KEY;
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [MESSAGES_KEY, DRAFT_KEY]);

  useEffect(() => {
    if (loading || hydratedKeyRef.current !== MESSAGES_KEY) return;
    if (messages.length > 0) {
      AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(messages)).catch(() => {});
    }
  }, [messages, loading, MESSAGES_KEY]);

  useEffect(() => {
    if (loading || hydratedKeyRef.current !== MESSAGES_KEY) return;
    AsyncStorage.setItem(DRAFT_KEY, draft).catch(() => {});
  }, [draft, loading, DRAFT_KEY]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    if (!loading) scrollToBottom();
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: `msg_${Date.now()}_u`,
      text: trimmed,
      sender: "user",
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setDraft("");
    setSending(true);

    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));

    const autoReply = getAutoReply(trimmed);
    const replyText = autoReply
      || "Thank you for reaching out. Our support team will respond shortly. For urgent matters, please call us or use WhatsApp.";

    const supportMsg: Message = {
      id: `msg_${Date.now()}_s`,
      text: replyText,
      sender: "support",
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, supportMsg]);
    setSending(false);
  }, []);

  const handleSend = useCallback(() => {
    sendMessage(draft);
  }, [draft, sendMessage]);

  const handleQuickReply = useCallback((text: string) => {
    sendMessage(text);
  }, [sendMessage]);

  const clearHistory = useCallback(async () => {
    await AsyncStorage.removeItem(MESSAGES_KEY).catch(() => {});
    const welcome: Message = {
      id: `msg_${Date.now()}`,
      text: config.content.supportMsg || `Hi! Welcome to ${config.platform.appName} support. How can we help you today?`,
      sender: "support",
      timestamp: Date.now(),
    };
    setMessages([welcome]);
  }, [MESSAGES_KEY, config]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.top}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.avatarCircle}>
            <Text style={{ fontSize: 18 }}>💬</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Support Chat</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineTxt}>Usually replies in minutes</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={clearHistory} style={styles.clearBtn}>
          <Ionicons name="trash-outline" size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(msg => (
          <View
            key={msg.id}
            style={[styles.messageRow, msg.sender === "user" ? styles.userRow : styles.supportRow]}
          >
            {msg.sender === "support" && (
              <View style={styles.supportAvatar}>
                <Text style={{ fontSize: 14 }}>🤖</Text>
              </View>
            )}
            <View
              style={[
                styles.bubble,
                msg.sender === "user" ? styles.userBubble : styles.supportBubble,
              ]}
            >
              <Text style={[styles.bubbleText, msg.sender === "user" && styles.userBubbleText]}>
                {msg.text}
              </Text>
              <Text style={[styles.timeText, msg.sender === "user" && { color: "rgba(255,255,255,0.65)" }]}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          </View>
        ))}

        {sending && (
          <View style={[styles.messageRow, styles.supportRow]}>
            <View style={styles.supportAvatar}>
              <Text style={{ fontSize: 14 }}>🤖</Text>
            </View>
            <View style={styles.typingBubble}>
              <View style={styles.typingDots}>
                <View style={[styles.dot, { opacity: 0.4 }]} />
                <View style={[styles.dot, { opacity: 0.7 }]} />
                <View style={styles.dot} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {messages.length <= 2 && !sending && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickRepliesScroll}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
        >
          {QUICK_REPLIES.map(qr => (
            <TouchableOpacity
              key={qr}
              activeOpacity={0.8}
              onPress={() => handleQuickReply(qr)}
              style={styles.quickChip}
            >
              <Text style={styles.quickChipTxt}>{qr}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message..."
          placeholderTextColor={C.textMuted}
          style={styles.input}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSend}
          disabled={!draft.trim() || sending}
          style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
        >
          <Ionicons name="send" size={18} color={C.textInverse} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.primarySoft ?? C.primaryLight ?? "#EDE9FF", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: Font.bold, fontSize: 15, color: C.text },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#22C55E" },
  onlineTxt: { fontFamily: Font.regular, fontSize: 11, color: C.textMuted },
  clearBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.surfaceSecondary, alignItems: "center", justifyContent: "center" },

  messageList: { flex: 1 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  userRow: { justifyContent: "flex-end" },
  supportRow: { justifyContent: "flex-start" },
  supportAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.primarySoft ?? "#EDE9FF", alignItems: "center", justifyContent: "center", marginBottom: 2 },

  bubble: { maxWidth: "75%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  supportBubble: { backgroundColor: C.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border },
  bubbleText: { fontFamily: Font.regular, fontSize: 14, color: C.text, lineHeight: 20 },
  userBubbleText: { color: "#fff" },
  timeText: { fontFamily: Font.regular, fontSize: 10, color: C.textMuted, marginTop: 4, textAlign: "right" },

  typingBubble: { backgroundColor: C.surface, borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: C.border },
  typingDots: { flexDirection: "row", gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.textMuted },

  quickRepliesScroll: { flexGrow: 0, borderTopWidth: 1, borderTopColor: C.borderLight, backgroundColor: C.surface },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.primarySoft ?? "#EDE9FF", borderWidth: 1, borderColor: C.primary + "30" },
  quickChipTxt: { fontFamily: Font.medium, fontSize: 12, color: C.primary },

  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.borderLight,
  },
  input: {
    flex: 1, minHeight: 42, maxHeight: 100,
    borderWidth: 1.5, borderColor: C.border, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontFamily: Font.regular, fontSize: 14, color: C.text,
    backgroundColor: C.surfaceSecondary,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  sendBtnDisabled: { backgroundColor: C.border, shadowOpacity: 0 },
});
