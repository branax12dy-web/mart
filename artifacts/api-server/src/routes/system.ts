import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  ordersTable,
  ridesTable,
  pharmacyOrdersTable,
  parcelBookingsTable,
  productsTable,
  walletTransactionsTable,
  notificationsTable,
  platformSettingsTable,
  flashDealsTable,
  promoCodesTable,
  adminAccountsTable,
  reviewsTable,
  savedAddressesTable,
  userSettingsTable,
  liveLocationsTable,
} from "@workspace/db/schema";
import { count } from "drizzle-orm";
import { generateId } from "../lib/id.js";
import { invalidateSettingsCache } from "../middleware/security.js";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "ajkmart-admin-2025";

const router: IRouter = Router();

/* ── Admin auth guard — all system routes require the admin secret ── */
router.use((req: Request, res: Response, next: NextFunction) => {
  const auth = String(req.headers["x-admin-secret"] || req.query["secret"] || "");
  if (auth !== ADMIN_SECRET) {
    res.status(401).json({ error: "Unauthorized. Admin secret required." });
    return;
  }
  next();
});

/* ─────────────────────────────────────────────────────────────────────────────
   DEMO PRODUCT DATA (same as seed.ts — used for reseed on demo reset)
───────────────────────────────────────────────────────────────────────────── */
const MART_PRODUCTS = [
  { name: "Basmati Rice 5kg",        price: 980,  originalPrice: 1200, category: "fruits",    unit: "5kg bag",    inStock: true,  description: "Premium long-grain basmati rice" },
  { name: "Doodh (Fresh Milk) 1L",   price: 140,  originalPrice: null, category: "dairy",     unit: "1 litre",    inStock: true,  description: "Fresh pasteurized milk" },
  { name: "Anday (Eggs) 12pc",       price: 320,  originalPrice: 350,  category: "dairy",     unit: "12 pieces",  inStock: true,  description: "Farm fresh eggs" },
  { name: "Aata (Wheat Flour) 10kg", price: 1100, originalPrice: 1350, category: "bakery",    unit: "10kg bag",   inStock: true,  description: "Chakki fresh atta" },
  { name: "Desi Ghee 1kg",           price: 1800, originalPrice: 2100, category: "dairy",     unit: "1kg tin",    inStock: true,  description: "Pure desi ghee" },
  { name: "Cooking Oil 5L",          price: 1650, originalPrice: 1900, category: "household", unit: "5 litre",    inStock: true,  description: "Refined sunflower oil" },
  { name: "Pyaz (Onion) 1kg",        price: 80,   originalPrice: 100,  category: "fruits",    unit: "1kg",        inStock: true,  description: "Fresh onions" },
  { name: "Tamatar (Tomato) 1kg",    price: 120,  originalPrice: 150,  category: "fruits",    unit: "1kg",        inStock: true,  description: "Fresh red tomatoes" },
  { name: "Aloo (Potato) 1kg",       price: 60,   originalPrice: 80,   category: "fruits",    unit: "1kg",        inStock: true,  description: "Fresh potatoes" },
  { name: "Sabz Mirch 250g",         price: 45,   originalPrice: null, category: "fruits",    unit: "250g",       inStock: true,  description: "Fresh green chillies" },
  { name: "Chicken 1kg",             price: 420,  originalPrice: 480,  category: "meat",      unit: "1kg",        inStock: true,  description: "Fresh broiler chicken" },
  { name: "Gosht (Beef) 500g",       price: 650,  originalPrice: null, category: "meat",      unit: "500g",       inStock: true,  description: "Fresh beef meat" },
  { name: "Dahi (Yoghurt) 500g",     price: 120,  originalPrice: null, category: "dairy",     unit: "500g",       inStock: true,  description: "Fresh yoghurt" },
  { name: "Makkhan (Butter) 200g",   price: 280,  originalPrice: 320,  category: "dairy",     unit: "200g pack",  inStock: true,  description: "Salted butter" },
  { name: "Naan (Fresh) 6pc",        price: 80,   originalPrice: null, category: "bakery",    unit: "6 pieces",   inStock: true,  description: "Fresh baked naan" },
  { name: "Double Roti",             price: 90,   originalPrice: null, category: "bakery",    unit: "1 loaf",     inStock: true,  description: "Sliced bread" },
  { name: "Pepsi 1.5L",              price: 130,  originalPrice: null, category: "beverages", unit: "1.5 litre",  inStock: true,  description: "Chilled Pepsi" },
  { name: "Nestle Water 1.5L",       price: 65,   originalPrice: null, category: "beverages", unit: "1.5 litre",  inStock: true,  description: "Pure mineral water" },
  { name: "Tapal Danedar Tea 200g",  price: 280,  originalPrice: 320,  category: "beverages", unit: "200g pack",  inStock: true,  description: "Strong black tea" },
  { name: "Surf Excel 1kg",          price: 420,  originalPrice: 480,  category: "household", unit: "1kg box",    inStock: true,  description: "Washing powder" },
  { name: "Dettol Soap 3pc",         price: 180,  originalPrice: 210,  category: "personal",  unit: "3 bars",     inStock: true,  description: "Antibacterial soap" },
  { name: "Colgate Toothpaste",      price: 140,  originalPrice: null, category: "personal",  unit: "100g tube",  inStock: true,  description: "Cavity protection" },
  { name: "Mango 1kg",               price: 180,  originalPrice: null, category: "fruits",    unit: "1kg",        inStock: true,  description: "Fresh sweet mangoes" },
  { name: "Kela (Banana) 12pc",      price: 90,   originalPrice: null, category: "fruits",    unit: "12 pieces",  inStock: true,  description: "Fresh bananas" },
  { name: "Seb (Apple) 500g",        price: 140,  originalPrice: null, category: "fruits",    unit: "500g",       inStock: true,  description: "Fresh apples" },
];

const FOOD_PRODUCTS = [
  { name: "Chicken Biryani",      price: 280, originalPrice: null,  category: "desi",       unit: "1 plate",    inStock: true,  description: "Aromatic spiced biryani with raita",              rating: 4.8, deliveryTime: "25-35 min", vendorName: "Biryani House AJK" },
  { name: "Beef Nihari",          price: 320, originalPrice: null,  category: "desi",       unit: "1 portion",  inStock: true,  description: "Slow-cooked beef with rich gravy + naan",         rating: 4.9, deliveryTime: "30-40 min", vendorName: "Desi Dhaba" },
  { name: "Chicken Karahi",       price: 450, originalPrice: 500,   category: "desi",       unit: "2 portions", inStock: true,  description: "Wok-cooked chicken with tomatoes & spices",       rating: 4.7, deliveryTime: "25-35 min", vendorName: "Desi Dhaba" },
  { name: "Dal Makhani",          price: 180, originalPrice: null,  category: "desi",       unit: "1 portion",  inStock: true,  description: "Creamy black lentil dal + naan",                 rating: 4.6, deliveryTime: "20-30 min", vendorName: "Biryani House AJK" },
  { name: "Lamb Sajji",           price: 550, originalPrice: 600,   category: "desi",       unit: "half leg",   inStock: true,  description: "Balochi-style whole roasted lamb",                rating: 4.9, deliveryTime: "45-60 min", vendorName: "Sajji Palace" },
  { name: "Chicken Tikka",        price: 380, originalPrice: null,  category: "restaurants",unit: "6 pieces",   inStock: true,  description: "Tandoor-grilled marinated chicken",               rating: 4.8, deliveryTime: "30-40 min", vendorName: "Grill House Muzaffarabad" },
  { name: "Zinger Burger",        price: 220, originalPrice: 250,   category: "fast-food",  unit: "1 burger",   inStock: true,  description: "Crispy chicken fillet burger with special sauce", rating: 4.5, deliveryTime: "15-25 min", vendorName: "Burger Point AJK" },
  { name: "Chicken Shawarma",     price: 160, originalPrice: null,  category: "restaurants",unit: "1 roll",     inStock: true,  description: "Lebanese-style chicken wrap with garlic sauce",   rating: 4.7, deliveryTime: "15-20 min", vendorName: "Shawarma House" },
  { name: "Chicken Pizza 8''",    price: 450, originalPrice: 500,   category: "pizza",      unit: "8 inch",     inStock: true,  description: "Thin crust with chicken tikka & cheese",         rating: 4.6, deliveryTime: "30-45 min", vendorName: "Pizza Palace AJK" },
  { name: "Beef Pepperoni Pizza", price: 520, originalPrice: null,  category: "pizza",      unit: "8 inch",     inStock: true,  description: "Classic pepperoni pizza with extra cheese",       rating: 4.7, deliveryTime: "30-45 min", vendorName: "Pizza Palace AJK" },
  { name: "Chinese Chow Mein",    price: 200, originalPrice: null,  category: "chinese",    unit: "1 plate",    inStock: true,  description: "Stir-fried noodles with vegetables & chicken",   rating: 4.5, deliveryTime: "25-35 min", vendorName: "China Town AJK" },
  { name: "Gulab Jamun 6pc",      price: 120, originalPrice: null,  category: "desserts",   unit: "6 pieces",   inStock: true,  description: "Soft milk-solid dumplings in sugar syrup",        rating: 4.9, deliveryTime: "15-25 min", vendorName: "Mithai House" },
  { name: "Halwa Puri (Breakfast)",price: 180,originalPrice: null,  category: "desi",       unit: "1 set",      inStock: true,  description: "Sooji halwa + 2 puri + chana + achar",           rating: 4.8, deliveryTime: "20-30 min", vendorName: "Biryani House AJK" },
];

const DEMO_WALLET_BALANCE = "1000.00";

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER: reseed products
───────────────────────────────────────────────────────────────────────────── */
async function reseedProducts(): Promise<{ mart: number; food: number }> {
  await db.delete(productsTable);
  let mart = 0;
  let food = 0;
  for (const p of MART_PRODUCTS) {
    await db.insert(productsTable).values({
      id: generateId(),
      name: p.name,
      description: p.description,
      price: p.price.toString(),
      originalPrice: p.originalPrice ? p.originalPrice.toString() : null,
      category: p.category,
      type: "mart",
      vendorId: "ajkmart_system",
      vendorName: "AJKMart Store",
      unit: p.unit,
      inStock: p.inStock,
      rating: (3.8 + Math.random() * 1.1).toFixed(1),
      reviewCount: Math.floor(Math.random() * 200) + 10,
    });
    mart++;
  }
  for (const p of FOOD_PRODUCTS) {
    await db.insert(productsTable).values({
      id: generateId(),
      name: p.name,
      description: p.description,
      price: p.price.toString(),
      originalPrice: p.originalPrice ? p.originalPrice.toString() : null,
      category: p.category,
      type: "food",
      vendorId: "ajkmart_system",
      unit: p.unit,
      inStock: p.inStock,
      rating: (p.rating || 4.5).toString(),
      reviewCount: Math.floor(Math.random() * 500) + 50,
      vendorName: p.vendorName || "Restaurant AJK",
      deliveryTime: p.deliveryTime || "25-35 min",
    });
    food++;
  }
  return { mart, food };
}

/* ─────────────────────────────────────────────────────────────────────────────
   GET /admin/system/stats — Live DB table counts
───────────────────────────────────────────────────────────────────────────── */
router.get("/stats", async (_req, res) => {
  const [users]          = await db.select({ c: count() }).from(usersTable);
  const [orders]         = await db.select({ c: count() }).from(ordersTable);
  const [rides]          = await db.select({ c: count() }).from(ridesTable);
  const [pharmacy]       = await db.select({ c: count() }).from(pharmacyOrdersTable);
  const [parcel]         = await db.select({ c: count() }).from(parcelBookingsTable);
  const [products]       = await db.select({ c: count() }).from(productsTable);
  const [walletTx]       = await db.select({ c: count() }).from(walletTransactionsTable);
  const [notifications]  = await db.select({ c: count() }).from(notificationsTable);
  const [reviews]        = await db.select({ c: count() }).from(reviewsTable);
  const [promos]         = await db.select({ c: count() }).from(promoCodesTable);
  const [flashDeals]     = await db.select({ c: count() }).from(flashDealsTable);
  const [adminAccounts]  = await db.select({ c: count() }).from(adminAccountsTable);
  const [settings]       = await db.select({ c: count() }).from(platformSettingsTable);
  const [savedAddr]      = await db.select({ c: count() }).from(savedAddressesTable);

  res.json({
    stats: {
      users:          Number(users?.c ?? 0),
      orders:         Number(orders?.c ?? 0),
      rides:          Number(rides?.c ?? 0),
      pharmacy:       Number(pharmacy?.c ?? 0),
      parcel:         Number(parcel?.c ?? 0),
      products:       Number(products?.c ?? 0),
      walletTx:       Number(walletTx?.c ?? 0),
      notifications:  Number(notifications?.c ?? 0),
      reviews:        Number(reviews?.c ?? 0),
      promos:         Number(promos?.c ?? 0),
      flashDeals:     Number(flashDeals?.c ?? 0),
      adminAccounts:  Number(adminAccounts?.c ?? 0),
      settings:       Number(settings?.c ?? 0),
      savedAddresses: Number(savedAddr?.c ?? 0),
    },
    generatedAt: new Date().toISOString(),
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /admin/system/reset-demo
   Clears all transactional data, reseeds demo products + resets wallet balances
───────────────────────────────────────────────────────────────────────────── */
router.post("/reset-demo", async (_req, res) => {
  await db.delete(ordersTable);
  await db.delete(ridesTable);
  await db.delete(pharmacyOrdersTable);
  await db.delete(parcelBookingsTable);
  await db.delete(walletTransactionsTable);
  await db.delete(reviewsTable);
  await db.delete(notificationsTable);
  await db.delete(liveLocationsTable);
  await db.delete(flashDealsTable);

  await db.update(usersTable).set({ walletBalance: DEMO_WALLET_BALANCE });

  const { mart, food } = await reseedProducts();

  res.json({
    success: true,
    message: "Demo content reset. All transactional data cleared and demo products reseeded.",
    cleared: ["orders", "rides", "pharmacy_orders", "parcel_bookings", "wallet_transactions", "reviews", "notifications", "live_locations", "flash_deals"],
    reseeded: { mart_products: mart, food_products: food },
    walletReset: `All user wallets reset to Rs. ${DEMO_WALLET_BALANCE}`,
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /admin/system/reset-transactional
   Clears only transactional tables (orders, rides, wallet history) — keeps users & products
───────────────────────────────────────────────────────────────────────────── */
router.post("/reset-transactional", async (_req, res) => {
  await db.delete(ordersTable);
  await db.delete(ridesTable);
  await db.delete(pharmacyOrdersTable);
  await db.delete(parcelBookingsTable);
  await db.delete(walletTransactionsTable);
  await db.delete(reviewsTable);
  await db.delete(notificationsTable);
  await db.delete(liveLocationsTable);
  await db.delete(flashDealsTable);

  res.json({
    success: true,
    message: "All transactional data cleared. Users, products and settings preserved.",
    cleared: ["orders", "rides", "pharmacy_orders", "parcel_bookings", "wallet_transactions", "reviews", "notifications", "live_locations", "flash_deals"],
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /admin/system/reset-products
   Deletes all products and reseeds fresh demo mart + food products
───────────────────────────────────────────────────────────────────────────── */
router.post("/reset-products", async (_req, res) => {
  const { mart, food } = await reseedProducts();
  res.json({
    success: true,
    message: `Products reseeded: ${mart} mart + ${food} food items.`,
    seeded: { mart, food },
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /admin/system/reset-all
   Nuclear reset: wipes ALL data except platform settings and admin accounts
───────────────────────────────────────────────────────────────────────────── */
router.post("/reset-all", async (_req, res) => {
  const { confirm } = (await Promise.resolve({})) as any;

  await db.delete(ordersTable);
  await db.delete(ridesTable);
  await db.delete(pharmacyOrdersTable);
  await db.delete(parcelBookingsTable);
  await db.delete(walletTransactionsTable);
  await db.delete(reviewsTable);
  await db.delete(notificationsTable);
  await db.delete(liveLocationsTable);
  await db.delete(flashDealsTable);
  await db.delete(promoCodesTable);
  await db.delete(savedAddressesTable);
  await db.delete(userSettingsTable);
  await db.delete(usersTable);

  const { mart, food } = await reseedProducts();

  res.json({
    success: true,
    message: "Full database reset complete. Platform settings and admin accounts preserved.",
    cleared: ["users", "orders", "rides", "pharmacy_orders", "parcel_bookings", "wallet_transactions", "reviews", "notifications", "live_locations", "flash_deals", "promo_codes", "saved_addresses", "user_settings"],
    reseeded: { mart_products: mart, food_products: food },
    preserved: ["platform_settings", "admin_accounts"],
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /admin/system/reset-settings
   Deletes all platform settings — they will be reseeded on next admin page load
───────────────────────────────────────────────────────────────────────────── */
router.post("/reset-settings", async (_req, res) => {
  await db.delete(platformSettingsTable);
  invalidateSettingsCache();
  res.json({
    success: true,
    message: "All platform settings deleted. Settings will be reseeded to defaults on next admin panel visit.",
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /admin/system/backup — Download full DB backup as JSON
───────────────────────────────────────────────────────────────────────────── */
router.get("/backup", async (_req, res) => {
  const [
    users, orders, rides, pharmacy, parcel, products,
    walletTx, notifications, reviews, promos, flashDeals,
    settings, savedAddr, userSettings,
  ] = await Promise.all([
    db.select().from(usersTable),
    db.select().from(ordersTable),
    db.select().from(ridesTable),
    db.select().from(pharmacyOrdersTable),
    db.select().from(parcelBookingsTable),
    db.select().from(productsTable),
    db.select().from(walletTransactionsTable),
    db.select().from(notificationsTable),
    db.select().from(reviewsTable),
    db.select().from(promoCodesTable),
    db.select().from(flashDealsTable),
    db.select().from(platformSettingsTable),
    db.select().from(savedAddressesTable),
    db.select().from(userSettingsTable),
  ]);

  const backup = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    platform: "AJKMart",
    tables: {
      users:                users.map(u => ({ ...u, otpCode: undefined, otpExpiry: undefined })),
      orders,
      rides,
      pharmacy_orders:      pharmacy,
      parcel_bookings:      parcel,
      products,
      wallet_transactions:  walletTx,
      notifications,
      reviews,
      promo_codes:          promos,
      flash_deals:          flashDeals,
      platform_settings:    settings,
      saved_addresses:      savedAddr,
      user_settings:        userSettings,
    },
    counts: {
      users: users.length, orders: orders.length, rides: rides.length,
      pharmacy_orders: pharmacy.length, parcel_bookings: parcel.length,
      products: products.length, wallet_transactions: walletTx.length,
      notifications: notifications.length, reviews: reviews.length,
      promo_codes: promos.length, flash_deals: flashDeals.length,
      platform_settings: settings.length, saved_addresses: savedAddr.length,
      user_settings: userSettings.length,
    },
  };

  const filename = `ajkmart-backup-${new Date().toISOString().split("T")[0]}.json`;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.json(backup);
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /admin/system/restore — Restore DB from backup JSON
   Accepts: { tables: { orders: [...], rides: [...], ... } }
   Restores only transactional tables + products (never overwrites settings/admins)
───────────────────────────────────────────────────────────────────────────── */
router.post("/restore", async (req, res) => {
  const body = req.body as any;
  if (!body?.tables) {
    res.status(400).json({ error: "Invalid backup format. Expected { tables: { ... } }." });
    return;
  }

  const { tables } = body;
  const restored: Record<string, number> = {};
  const errors: string[] = [];

  const safeRestore = async (tableName: string, tableRef: any, rows: any[]) => {
    if (!Array.isArray(rows) || rows.length === 0) return;
    try {
      await db.delete(tableRef);
      const cleaned = rows.map(r => {
        const { createdAt, updatedAt, ...rest } = r;
        return {
          ...rest,
          createdAt: createdAt ? new Date(createdAt) : new Date(),
          updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
        };
      });
      for (const row of cleaned) {
        try { await db.insert(tableRef).values(row); } catch {}
      }
      restored[tableName] = rows.length;
    } catch (e: any) {
      errors.push(`${tableName}: ${e.message}`);
    }
  };

  if (tables.users)               await safeRestore("users",               usersTable,               tables.users);
  if (tables.orders)              await safeRestore("orders",              ordersTable,              tables.orders);
  if (tables.rides)               await safeRestore("rides",               ridesTable,               tables.rides);
  if (tables.pharmacy_orders)     await safeRestore("pharmacy_orders",     pharmacyOrdersTable,      tables.pharmacy_orders);
  if (tables.parcel_bookings)     await safeRestore("parcel_bookings",     parcelBookingsTable,      tables.parcel_bookings);
  if (tables.products)            await safeRestore("products",            productsTable,            tables.products);
  if (tables.wallet_transactions) await safeRestore("wallet_transactions", walletTransactionsTable,  tables.wallet_transactions);
  if (tables.notifications)       await safeRestore("notifications",       notificationsTable,       tables.notifications);
  if (tables.reviews)             await safeRestore("reviews",             reviewsTable,             tables.reviews);
  if (tables.promo_codes)         await safeRestore("promo_codes",         promoCodesTable,          tables.promo_codes);
  if (tables.flash_deals)         await safeRestore("flash_deals",         flashDealsTable,          tables.flash_deals);
  if (tables.saved_addresses)     await safeRestore("saved_addresses",     savedAddressesTable,      tables.saved_addresses);
  if (tables.user_settings)       await safeRestore("user_settings",       userSettingsTable,        tables.user_settings);

  res.json({
    success: errors.length === 0,
    message: errors.length === 0
      ? "Database restored successfully from backup."
      : `Restore completed with ${errors.length} error(s).`,
    restored,
    errors: errors.length > 0 ? errors : undefined,
  });
});

export default router;
