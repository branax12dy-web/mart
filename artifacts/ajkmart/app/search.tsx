import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useCart } from "@/context/CartContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { getProducts } from "@workspace/api-client-react";
import type { GetProductsType, Product } from "@workspace/api-client-react";

const C = Colors.light;

type ServiceKey = "mart" | "food" | "pharmacy";

interface SearchResult {
  id: string;
  name: string;
  price: number;
  image?: string;
  type: ServiceKey;
  category?: string;
  originalPrice?: number;
}

const SERVICE_ROUTES: Record<ServiceKey, "/mart" | "/food" | "/pharmacy"> = {
  mart: "/mart",
  food: "/food",
  pharmacy: "/pharmacy",
};

const SERVICE_META: Record<ServiceKey, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  mart:     { label: "Mart",     icon: "basket-outline",   color: "#7C3AED", bg: "#F3E8FF" },
  food:     { label: "Food",     icon: "restaurant-outline", color: "#D97706", bg: "#FEF3C7" },
  pharmacy: { label: "Pharmacy", icon: "medical-outline",  color: "#059669", bg: "#D1FAE5" },
};

function ServiceBadge({ type }: { type: ServiceKey }) {
  const m = SERVICE_META[type];
  return (
    <View style={[s.badge, { backgroundColor: m.bg }]}>
      <Ionicons name={m.icon} size={11} color={m.color} />
      <Text style={[s.badgeTxt, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

export default function UniversalSearchScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { addItem, cartType, itemCount, clearCart } = useCart();
  const { config } = usePlatformConfig();

  const [query, setQuery] = useState("");
  const [sections, setSections] = useState<Array<{ title: string; data: SearchResult[]; type: ServiceKey }>>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [added, setAdded] = useState<Record<string, boolean>>({});

  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enabledServices: ServiceKey[] = [
    ...(config.features.mart ? ["mart" as ServiceKey] : []),
    ...(config.features.food ? ["food" as ServiceKey] : []),
    ...(config.features.pharmacy ? ["pharmacy" as ServiceKey] : []),
  ];

  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim()) { setSections([]); return; }
    setLoading(true);
    setSearchError(false);

    const results = await Promise.allSettled(
      enabledServices.map((svc) =>
        getProducts({ type: svc as GetProductsType, search: q, limit: 20 } as Parameters<typeof getProducts>[0])
          .then((data) =>
            (data?.products || []).map((p: Product) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              image: p.image,
              category: p.category,
              originalPrice: p.originalPrice,
              type: svc,
            } as SearchResult))
          )
      )
    );

    const newSections: Array<{ title: string; data: SearchResult[]; type: ServiceKey }> = [];
    let anySuccess = false;
    results.forEach((result, i) => {
      const svc = enabledServices[i]!;
      if (result.status === "fulfilled" && result.value.length > 0) {
        newSections.push({ title: SERVICE_META[svc].label, data: result.value, type: svc });
        anySuccess = true;
      } else if (result.status === "rejected") {
        console.warn(`[Search] ${svc} fetch failed:`, result.reason instanceof Error ? result.reason.message : String(result.reason));
      }
    });

    setSections(newSections);
    if (!anySuccess && results.every((r) => r.status === "rejected")) {
      setSearchError(true);
    }
    setLoading(false);
  }, [enabledServices.join(",")]);

  const onChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setSections([]); return; }
    debounceRef.current = setTimeout(() => fetchResults(text), 350);
  };

  const doAddItem = (item: SearchResult) => {
    addItem({ productId: item.id, name: item.name, price: item.price, quantity: 1, image: item.image, type: item.type as "mart" | "food" });
    setAdded((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => setAdded((prev) => ({ ...prev, [item.id]: false })), 1500);
  };

  const handleAdd = (item: SearchResult) => {
    if (item.type === "pharmacy") {
      router.push("/pharmacy");
      return;
    }
    if (itemCount > 0 && cartType !== item.type && cartType !== "none") {
      const meta = SERVICE_META[item.type];
      Alert.alert(
        `Switch to ${meta.label}?`,
        `Your cart has items from another service. Adding this item will clear your current cart.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Clear & Add", style: "destructive", onPress: () => { clearCart(); doAddItem(item); } },
        ],
      );
      return;
    }
    doAddItem(item);
  };

  const totalResults = sections.reduce((acc, s) => acc + s.data.length, 0);

  return (
    <View style={[s.screen, { paddingTop: topPad }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <View style={s.inputWrap}>
          <Ionicons name="search-outline" size={18} color={C.textMuted} />
          <TextInput
            ref={inputRef}
            style={s.input}
            value={query}
            onChangeText={onChangeText}
            placeholder="Search across all services…"
            placeholderTextColor={C.textMuted}
            returnKeyType="search"
            autoCapitalize="none"
            autoFocus
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(""); setSections([]); }}>
              <Ionicons name="close-circle" size={18} color={C.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {loading && (
        <View style={s.center}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={s.emptySub}>Searching all services…</Text>
        </View>
      )}

      {!loading && query.trim() && totalResults === 0 && searchError && (
        <View style={s.center}>
          <Ionicons name="wifi-outline" size={40} color="#EF4444" />
          <Text style={[s.emptyTxt, { color: "#EF4444" }]}>Search failed</Text>
          <Text style={s.emptySub}>Check your connection and try again</Text>
          <Pressable onPress={() => fetchResults(query)} style={s.retryBtn}>
            <Text style={s.retryBtnTxt}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!loading && query.trim() && totalResults === 0 && !searchError && (
        <View style={s.center}>
          <Ionicons name="search-outline" size={40} color={C.textMuted} />
          <Text style={s.emptyTxt}>No results for "{query}"</Text>
          <Text style={s.emptySub}>Try a different keyword or browse a service</Text>
          <View style={s.noResultsCtaRow}>
            {enabledServices.filter((sv) => sv !== "pharmacy").map((sv) => {
              const m = SERVICE_META[sv];
              return (
                <Pressable key={sv} onPress={() => router.push(SERVICE_ROUTES[sv])} style={[s.ctaBtn, { backgroundColor: m.bg }]}>
                  <Ionicons name={m.icon} size={14} color={m.color} />
                  <Text style={[s.ctaBtnTxt, { color: m.color }]}>Browse {m.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {!loading && !query.trim() && (
        <View style={s.center}>
          <Ionicons name="search" size={40} color={C.border} />
          <Text style={s.emptyTxt}>Start typing to search</Text>
          <Text style={s.emptySub}>Results from Mart, Food & Pharmacy</Text>
        </View>
      )}

      {!loading && totalResults > 0 && (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={s.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <Ionicons name={SERVICE_META[section.type].icon} size={14} color={SERVICE_META[section.type].color} />
              <Text style={[s.sectionTitle, { color: SERVICE_META[section.type].color }]}>{section.title}</Text>
              <View style={[s.sectionDivider, { backgroundColor: SERVICE_META[section.type].color + "40" }]} />
            </View>
          )}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardInfo}>
                <View style={s.cardMeta}>
                  <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
                  <ServiceBadge type={item.type} />
                </View>
                {item.originalPrice && Number(item.originalPrice) > item.price ? (
                  <View style={s.priceRow}>
                    <Text style={s.cardPrice}>Rs. {item.price.toLocaleString()}</Text>
                    <Text style={s.cardOriginal}>Rs. {Number(item.originalPrice).toLocaleString()}</Text>
                  </View>
                ) : (
                  <Text style={s.cardPrice}>Rs. {item.price.toLocaleString()}</Text>
                )}
              </View>
              {item.type === "pharmacy" ? (
                <Pressable onPress={() => router.push("/pharmacy")} style={s.viewBtn}>
                  <Ionicons name="arrow-forward" size={16} color="#059669" />
                </Pressable>
              ) : (
                <Pressable onPress={() => handleAdd(item)} style={[s.addBtn, added[item.id] && s.addBtnDone]}>
                  <Ionicons name={added[item.id] ? "checkmark" : "add"} size={18} color="#fff" />
                </Pressable>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: C.background },
  header:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, gap: 10, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:   { padding: 6 },
  inputWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surfaceSecondary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  input:     { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: C.text },
  list:      { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 14, paddingBottom: 6 },
  sectionTitle:  { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5, textTransform: "uppercase" },
  sectionDivider: { flex: 1, height: 1, marginLeft: 6 },
  card:      { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  cardInfo:  { flex: 1 },
  cardMeta:  { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4, gap: 8 },
  cardName:  { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: C.text },
  priceRow:  { flexDirection: "row", alignItems: "center", gap: 8 },
  cardPrice: { fontSize: 14, fontFamily: "Inter_700Bold", color: C.primary },
  cardOriginal: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textMuted, textDecorationLine: "line-through" },
  badge:     { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt:  { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  addBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  addBtnDone:{ backgroundColor: "#10B981" },
  viewBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center" },
  center:    { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 60, gap: 8 },
  emptyTxt:  { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.text, marginTop: 8 },
  emptySub:  { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted },
  retryBtn:  { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#EF4444", borderRadius: 12 },
  retryBtnTxt: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  noResultsCtaRow: { flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap", justifyContent: "center" },
  ctaBtn:    { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  ctaBtnTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
