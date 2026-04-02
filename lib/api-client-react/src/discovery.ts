import { customFetch } from "./custom-fetch";

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  placement: string;
  targetService: string | null;
  gradient1: string | null;
  gradient2: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface RecommendationProduct {
  id: string;
  name: string;
  price: number;
  image: string | null;
  category: string | null;
  rating: number | null;
  vendorName: string | null;
  originalPrice: string | null;
  score?: number;
}

export const getBanners = async (
  params?: { placement?: string; service?: string },
  options?: RequestInit,
): Promise<Banner[]> => {
  const qs = new URLSearchParams();
  if (params?.placement) qs.set("placement", params.placement);
  if (params?.service) qs.set("service", params.service);
  const q = qs.toString();
  const res = await customFetch(`/banners${q ? `?${q}` : ""}`, { ...options, method: "GET" });
  return res.banners ?? [];
};

export const getTrending = async (
  params?: { limit?: number },
  options?: RequestInit,
): Promise<RecommendationProduct[]> => {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  const res = await customFetch(`/recommendations/trending${q ? `?${q}` : ""}`, { ...options, method: "GET" });
  return res.recommendations ?? res.products ?? [];
};

export const getForYou = async (
  params?: { limit?: number },
  options?: RequestInit,
): Promise<RecommendationProduct[]> => {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  const res = await customFetch(`/recommendations/for-you${q ? `?${q}` : ""}`, { ...options, method: "GET" });
  return res.products ?? [];
};

export const getSimilar = async (
  productId: string,
  params?: { limit?: number },
  options?: RequestInit,
): Promise<RecommendationProduct[]> => {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  const res = await customFetch(`/recommendations/similar/${productId}${q ? `?${q}` : ""}`, { ...options, method: "GET" });
  return res.products ?? [];
};

export const trackInteraction = async (
  body: { productId: string; type: "view" | "add_to_cart" | "purchase" | "wishlist" },
  options?: RequestInit,
): Promise<any> => {
  return customFetch(`/recommendations/track`, {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(body),
  });
};

export const getProductVariants = async (
  productId: string,
  options?: RequestInit,
): Promise<any[]> => {
  const res = await customFetch(`/variants/product/${productId}`, { ...options, method: "GET" });
  return res.variants ?? [];
};
