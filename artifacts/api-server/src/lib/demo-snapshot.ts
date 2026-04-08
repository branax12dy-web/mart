import { db } from "@workspace/db";
import { demoBackupsTable, platformSettingsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

export interface DemoVendor {
  id: string; name: string; phone: string; email: string;
  storeName: string; storeCategory: string; storeIsOpen: boolean;
  approvalStatus: string; isActive: boolean; isBanned: boolean;
  walletBalance: number; totalOrders: number; totalRevenue: number;
  pendingOrders: number; createdAt: string; lastLoginAt: string | null;
}
export interface DemoOrder {
  id: string; status: string; type: string; total: number;
  vendorId: string; vendorName: string; riderName: string | null;
  createdAt: string; updatedAt: string;
}
export interface DemoRider {
  id: string; name: string; phone: string; email: string;
  walletBalance: number; isActive: boolean; isBanned: boolean;
  isRestricted: boolean; isOnline: boolean; avgRating: number;
  ratingCount: number; penaltyTotal: number; cancelCount: number;
  ignoreCount: number; createdAt: string; lastLoginAt: string | null;
}
export interface DemoProduct {
  id: string; name: string; category: string; price: number;
  originalPrice: number | null; rating: number; vendorId: string;
  vendorName: string; inStock: boolean; approvalStatus: string; createdAt: string;
}

export interface DemoSnapshot {
  vendors: DemoVendor[];
  orders: DemoOrder[];
  riders: DemoRider[];
  products: DemoProduct[];
  source: "demo_backups" | "seeded";
}

const SEEDED_DEMO: Omit<DemoSnapshot, "source"> = {
  vendors: [
    { id: "demo_v1", name: "Omar Sheikh",   phone: "+923001234567", email: "omar@demo.test",  storeName: "Green Basket Mart", storeCategory: "grocery",  storeIsOpen: true,  approvalStatus: "approved", isActive: true,  isBanned: false, walletBalance: 12500, totalOrders: 142, totalRevenue: 178500, pendingOrders: 3, createdAt: "2026-01-15T08:00:00Z", lastLoginAt: "2026-04-08T07:30:00Z" },
    { id: "demo_v2", name: "Hira Baig",     phone: "+923012345678", email: "hira@demo.test",  storeName: "Burger Factory",    storeCategory: "food",     storeIsOpen: true,  approvalStatus: "approved", isActive: true,  isBanned: false, walletBalance:  8900, totalOrders:  89, totalRevenue:  62300, pendingOrders: 1, createdAt: "2026-02-01T09:00:00Z", lastLoginAt: "2026-04-07T20:00:00Z" },
    { id: "demo_v3", name: "Dr. Asim Khan", phone: "+923023456789", email: "asim@demo.test",  storeName: "MedPlus Pharmacy",  storeCategory: "pharmacy", storeIsOpen: false, approvalStatus: "approved", isActive: true,  isBanned: false, walletBalance:  5600, totalOrders:  34, totalRevenue:  21200, pendingOrders: 0, createdAt: "2026-02-15T10:00:00Z", lastLoginAt: "2026-04-06T14:00:00Z" },
    { id: "demo_v4", name: "Tariq Mehmood", phone: "+923034567890", email: "tariq@demo.test", storeName: "QuickParts Store",  storeCategory: "mart",     storeIsOpen: true,  approvalStatus: "pending",  isActive: false, isBanned: false, walletBalance:  2100, totalOrders:  67, totalRevenue:  44800, pendingOrders: 2, createdAt: "2026-03-01T11:00:00Z", lastLoginAt: "2026-04-05T12:00:00Z" },
    { id: "demo_v5", name: "Sana Iqbal",    phone: "+923045678901", email: "sana@demo.test",  storeName: "Fresh Farms",       storeCategory: "grocery",  storeIsOpen: true,  approvalStatus: "approved", isActive: true,  isBanned: false, walletBalance: 21000, totalOrders: 211, totalRevenue: 264700, pendingOrders: 5, createdAt: "2025-12-01T08:00:00Z", lastLoginAt: "2026-04-08T08:00:00Z" },
  ],
  orders: [
    { id: "demo_o1", status: "delivered",  type: "mart",     total: 1250, vendorId: "demo_v1", vendorName: "Green Basket Mart", riderName: "Ali Hassan",  createdAt: "2026-04-07T10:22:00Z", updatedAt: "2026-04-07T11:00:00Z" },
    { id: "demo_o2", status: "preparing",  type: "food",     total:  650, vendorId: "demo_v2", vendorName: "Burger Factory",    riderName: null,           createdAt: "2026-04-08T09:15:00Z", updatedAt: "2026-04-08T09:20:00Z" },
    { id: "demo_o3", status: "on_the_way", type: "pharmacy", total:  480, vendorId: "demo_v3", vendorName: "MedPlus Pharmacy",  riderName: "Sara Khan",   createdAt: "2026-04-08T08:55:00Z", updatedAt: "2026-04-08T09:10:00Z" },
    { id: "demo_o4", status: "delivered",  type: "mart",     total: 2100, vendorId: "demo_v5", vendorName: "Fresh Farms",       riderName: "Usman Malik", createdAt: "2026-04-06T14:30:00Z", updatedAt: "2026-04-06T15:10:00Z" },
    { id: "demo_o5", status: "cancelled",  type: "mart",     total:  390, vendorId: "demo_v4", vendorName: "QuickParts Store",  riderName: null,           createdAt: "2026-04-05T18:10:00Z", updatedAt: "2026-04-05T18:15:00Z" },
  ],
  riders: [
    { id: "demo_r1", name: "Ali Hassan",  phone: "+923011112222", email: "ali@demo.test",   walletBalance: 4500, isActive: true,  isBanned: false, isRestricted: false, isOnline: true,  avgRating: 4.8, ratingCount: 312, penaltyTotal: 0,   cancelCount: 2,  ignoreCount: 1,  createdAt: "2026-01-10T08:00:00Z", lastLoginAt: "2026-04-08T08:30:00Z" },
    { id: "demo_r2", name: "Sara Khan",   phone: "+923022223333", email: "sara@demo.test",   walletBalance: 3200, isActive: true,  isBanned: false, isRestricted: false, isOnline: true,  avgRating: 4.7, ratingCount: 187, penaltyTotal: 0,   cancelCount: 3,  ignoreCount: 2,  createdAt: "2026-01-20T09:00:00Z", lastLoginAt: "2026-04-08T07:45:00Z" },
    { id: "demo_r3", name: "Usman Malik", phone: "+923033334444", email: "usman@demo.test",  walletBalance: 8900, isActive: true,  isBanned: false, isRestricted: false, isOnline: false, avgRating: 4.9, ratingCount: 521, penaltyTotal: 0,   cancelCount: 1,  ignoreCount: 0,  createdAt: "2025-11-05T08:00:00Z", lastLoginAt: "2026-04-07T22:00:00Z" },
    { id: "demo_r4", name: "Fatima Raza", phone: "+923044445555", email: "fatima@demo.test", walletBalance: 1500, isActive: true,  isBanned: false, isRestricted: false, isOnline: true,  avgRating: 4.5, ratingCount:  95, penaltyTotal: 250, cancelCount: 7,  ignoreCount: 4,  createdAt: "2026-02-10T10:00:00Z", lastLoginAt: "2026-04-08T06:00:00Z" },
    { id: "demo_r5", name: "Bilal Ahmed", phone: "+923055556666", email: "bilal@demo.test",  walletBalance:  800, isActive: false, isBanned: true,  isRestricted: false, isOnline: false, avgRating: 3.8, ratingCount:  42, penaltyTotal: 750, cancelCount: 15, ignoreCount: 10, createdAt: "2026-03-01T11:00:00Z", lastLoginAt: "2026-04-01T12:00:00Z" },
  ],
  products: [
    { id: "demo_p1", name: "Organic Tomatoes (1kg)",    category: "Grocery",  price: 120, originalPrice: 140,  rating: 4.6, vendorId: "demo_v1", vendorName: "Green Basket Mart", inStock: true,  approvalStatus: "approved", createdAt: "2026-01-20T08:00:00Z" },
    { id: "demo_p2", name: "Classic Beef Burger",        category: "Food",     price: 350, originalPrice: null, rating: 4.5, vendorId: "demo_v2", vendorName: "Burger Factory",    inStock: true,  approvalStatus: "approved", createdAt: "2026-02-05T09:00:00Z" },
    { id: "demo_p3", name: "Paracetamol 500mg (strip)",  category: "Pharmacy", price:  45, originalPrice:  50,  rating: 4.8, vendorId: "demo_v3", vendorName: "MedPlus Pharmacy",  inStock: true,  approvalStatus: "approved", createdAt: "2026-02-18T10:00:00Z" },
    { id: "demo_p4", name: "Basmati Rice (5kg)",         category: "Grocery",  price: 890, originalPrice: 950,  rating: 4.7, vendorId: "demo_v5", vendorName: "Fresh Farms",       inStock: false, approvalStatus: "approved", createdAt: "2026-01-10T08:00:00Z" },
    { id: "demo_p5", name: "Engine Oil 1L",              category: "Mart",     price: 480, originalPrice: null, rating: 4.3, vendorId: "demo_v4", vendorName: "QuickParts Store",  inStock: true,  approvalStatus: "pending",  createdAt: "2026-03-10T11:00:00Z" },
    { id: "demo_p6", name: "Mineral Water (24 bottles)", category: "Grocery",  price: 280, originalPrice: 300,  rating: 4.4, vendorId: "demo_v5", vendorName: "Fresh Farms",       inStock: true,  approvalStatus: "approved", createdAt: "2026-02-01T08:00:00Z" },
  ],
};

let _cachedSnapshot: DemoSnapshot | null = null;
let _snapshotLoadedAt = 0;
const SNAPSHOT_CACHE_TTL_MS = 30_000;

async function loadSnapshotFromDb(): Promise<DemoSnapshot | null> {
  const [latest] = await db
    .select({ tablesJson: demoBackupsTable.tablesJson })
    .from(demoBackupsTable)
    .orderBy(desc(demoBackupsTable.createdAt))
    .limit(1);
  if (!latest) return null;
  try {
    const parsed = JSON.parse(latest.tablesJson) as Partial<DemoSnapshot & { demo_vendors?: unknown; demo_orders?: unknown; demo_riders?: unknown; demo_products?: unknown }>;
    const v = (parsed.demo_vendors ?? parsed.vendors) as DemoVendor[] | undefined;
    const o = (parsed.demo_orders ?? parsed.orders) as DemoOrder[] | undefined;
    const r = (parsed.demo_riders ?? parsed.riders) as DemoRider[] | undefined;
    const p = (parsed.demo_products ?? parsed.products) as DemoProduct[] | undefined;
    if (v && o && r && p) {
      return { vendors: v, orders: o, riders: r, products: p, source: "demo_backups" };
    }
  } catch { /* ignore parse errors */ }
  return null;
}

export function invalidateDemoSnapshotCache(): void {
  _cachedSnapshot = null;
  _snapshotLoadedAt = 0;
}

export async function getDemoSnapshot(): Promise<DemoSnapshot> {
  const now = Date.now();
  if (_cachedSnapshot && (now - _snapshotLoadedAt) < SNAPSHOT_CACHE_TTL_MS) {
    return _cachedSnapshot;
  }
  const fromDb = await loadSnapshotFromDb();
  _cachedSnapshot = fromDb ?? { ...SEEDED_DEMO, source: "seeded" };
  _snapshotLoadedAt = now;
  return _cachedSnapshot;
}

export async function isPlatformDemoMode(): Promise<boolean> {
  const [row] = await db
    .select({ value: platformSettingsTable.value })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.key, "platform_mode"))
    .limit(1);
  return (row?.value ?? "demo") === "demo";
}
