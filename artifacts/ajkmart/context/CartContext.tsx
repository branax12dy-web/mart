import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    AsyncStorage.getItem("@ajkmart_cart").then(stored => {
      if (stored) setItems(JSON.parse(stored));
    });
  }, []);

  const save = (newItems: CartItem[]) => {
    setItems(newItems);
    AsyncStorage.setItem("@ajkmart_cart", JSON.stringify(newItems));
  };

  const addItem = (item: CartItem) => {
    const existing = items.find(i => i.productId === item.productId);
    if (existing) {
      save(items.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      save([...items, item]);
    }
  };

  const removeItem = (productId: string) => save(items.filter(i => i.productId !== productId));

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) return removeItem(productId);
    save(items.map(i => i.productId === productId ? { ...i, quantity: qty } : i));
  };

  const clearCart = () => save([]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, itemCount, total, addItem, removeItem, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
