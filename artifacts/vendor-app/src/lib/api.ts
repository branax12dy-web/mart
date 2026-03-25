const BASE = `/api`;

function getToken() {
  return localStorage.getItem("vendor_token") || "";
}

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers as Record<string, string> || {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  sendOtp:  (phone: string) => apiFetch("/auth/send-otp", { method: "POST", body: JSON.stringify({ phone }) }),
  verifyOtp:(phone: string, otp: string) => apiFetch("/auth/verify-otp", { method: "POST", body: JSON.stringify({ phone, otp }) }),

  getMe:          () => apiFetch("/vendor/me"),
  updateProfile:  (data: any) => apiFetch("/vendor/profile", { method: "PATCH", body: JSON.stringify(data) }),
  getDashboard:   () => apiFetch("/vendor/stats"),
  getOrders:      () => apiFetch("/vendor/orders"),
  updateOrder:    (id: string, status: string) => apiFetch(`/vendor/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  getProducts:    () => apiFetch("/vendor/products"),
  createProduct:  (data: any) => apiFetch("/vendor/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct:  (id: string, data: any) => apiFetch(`/vendor/products/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProduct:  (id: string) => apiFetch(`/vendor/products/${id}`, { method: "DELETE" }),
  toggleProduct:  (id: string, available: boolean) => apiFetch(`/vendor/products/${id}`, { method: "PATCH", body: JSON.stringify({ inStock: available }) }),
};
