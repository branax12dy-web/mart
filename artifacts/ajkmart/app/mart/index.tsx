import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useCart } from "@/context/CartContext";
import { useGetProducts, useGetCategories } from "@workspace/api-client-react";

const C = Colors.light;

function ProductCard({ product }: { product: any }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1, image: product.image, type: "mart" });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <View style={styles.productCard}>
      <View style={styles.productImageBox}>
        <Ionicons name="leaf-outline" size={40} color={C.textMuted} />
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        {product.unit && <Text style={styles.productUnit}>{product.unit}</Text>}
        <View style={styles.productFooter}>
          <View>
            <Text style={styles.productPrice}>Rs. {product.price}</Text>
            {product.originalPrice && (
              <Text style={styles.productOrigPrice}>Rs. {product.originalPrice}</Text>
            )}
          </View>
          <Pressable onPress={handleAdd} style={[styles.addBtn, added && styles.addBtnAdded]}>
            <Ionicons name={added ? "checkmark" : "add"} size={18} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function MartScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: catData } = useGetCategories({ type: "mart" });
  const { data, isLoading } = useGetProducts({ type: "mart", search: search || undefined, category: selectedCategory });

  const categories = catData?.categories || [];
  const products = data?.products || [];

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>AJKMart</Text>
          <Pressable onPress={() => router.push("/cart")} style={styles.cartBtn}>
            <Ionicons name="bag-outline" size={22} color={C.primary} />
          </Pressable>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={C.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search groceries..."
            placeholderTextColor={C.textMuted}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={C.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContent}>
          <Pressable
            onPress={() => setSelectedCategory(undefined)}
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          >
            <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>All</Text>
          </Pressable>
          {categories.map(cat => (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCategory(selectedCategory === cat.id ? undefined : cat.id)}
              style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
            >
              <Ionicons name={cat.icon as any} size={14} color={selectedCategory === cat.id ? "#fff" : C.primary} />
              <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={C.primary} size="large" />
          </View>
        ) : products.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="storefront-outline" size={56} color={C.border} />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyText}>Try a different search or category</Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </View>
        )}

        <View style={{ height: Platform.OS === "web" ? 34 : 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: C.surface, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backBtn: { padding: 6, marginRight: 10 },
  headerTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 20, color: C.text },
  cartBtn: { padding: 6 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: C.text },
  categoryScroll: { marginTop: 12 },
  categoryContent: { paddingHorizontal: 16, gap: 8, flexDirection: "row" },
  categoryChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#EFF6FF", borderWidth: 1.5, borderColor: "#DBEAFE" },
  categoryChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  categoryChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.primary },
  categoryChipTextActive: { color: "#fff" },
  productsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, paddingTop: 12, gap: 10 },
  productCard: { width: "47%", marginHorizontal: "1.5%", backgroundColor: C.surface, borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  productImageBox: { height: 120, backgroundColor: C.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  discountBadge: { position: "absolute", top: 8, left: 8, backgroundColor: C.danger, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  discountText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#fff" },
  productInfo: { padding: 12 },
  productName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: C.text, marginBottom: 3 },
  productUnit: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted, marginBottom: 8 },
  productFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  productPrice: { fontFamily: "Inter_700Bold", fontSize: 15, color: C.text },
  productOrigPrice: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted, textDecorationLine: "line-through" },
  addBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  addBtnAdded: { backgroundColor: C.success },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, color: C.text },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textSecondary },
});
