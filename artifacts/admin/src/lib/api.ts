export const getApiBase = () => {
  return `${window.location.origin}/api/admin`;
};

const ADMIN_TOKEN_KEY = "ajkmart_admin_token";

export const getToken = () => {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
};

export const setToken = (token: string) => {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
};

export const clearToken = () => {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
};

function decodeJwtExp(tok: string): number | null {
  try {
    const parts = tok.split(".");
    if (parts.length !== 3) return null;
    const b64 = (parts[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;
  const exp = decodeJwtExp(token);
  if (!exp) return true;
  return exp * 1000 < Date.now();
}

export const uploadAdminImage = async (file: File): Promise<string> => {
  const token = getToken();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const res = await fetch(`${getApiBase()}/uploads/admin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "x-admin-token": token } : {}),
          },
          body: JSON.stringify({ base64, mimeType: file.type }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Upload failed");
        const data = json.data !== undefined ? json.data : json;
        resolve(data.url as string);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

export const fetcher = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();

  const res = await fetch(`${getApiBase()}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-admin-token": token } : {}),
      ...options.headers,
    },
  });

  const json = await res.json();

  if (!res.ok) {
    if (res.status === 401 && token) {
      const currentToken = getToken();
      if (currentToken === token) {
        clearToken();
        window.location.href = import.meta.env.BASE_URL + "login";
      }
    }
    try {
      const { reportApiError } = await import("./error-reporter");
      reportApiError(endpoint, res.status, json.error || "An error occurred");
    } catch {}
    throw new Error(json.error || "An error occurred");
  }

  return json.data !== undefined ? json.data : json;
};
