import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, ordersTable, productsTable, walletTransactionsTable, notificationsTable } from "@workspace/db/schema";
import { eq, desc, and, sql, count, sum, gte, or } from "drizzle-orm";
import { generateId } from "../lib/id.js";

const router: IRouter = Router();

/* ── Auth Middleware ── */
async function vendorAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" }); return;
  }
  try {
    const token = authHeader.slice(7);
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [userId] = decoded.split(":");
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId!)).limit(1);
    if (!user) { res.status(401).json({ error: "User not found" }); return; }
    if (!user.isActive) { res.status(403).json({ error: "Account is inactive" }); return; }
    if (user.isBanned) { res.status(403).json({ error: "Account is banned" }); return; }
    const roles = (user.roles || user.role || "").split(",").map(r => r.trim());
    if (!roles.includes("vendor")) {
      res.status(403).json({ error: "Access denied. This portal is for vendors only." }); return;
    }
    (req as any).vendorId = user.id;
    (req as any).vendorUser = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

router.use(vendorAuth);

/* ── GET /vendor/me — Vendor profile ── */
router.get("/me", async (req, res) => {
  const user = (req as any).vendorUser;
  const vendorId = user.id;
  const today = new Date(); today.setHours(0,0,0,0);

  const [todayOrders, totalOrders, totalRevenue, productCount] = await Promise.all([
    db.select({ c: count() }).from(ordersTable).where(and(eq(ordersTable.vendorId, vendorId), gte(ordersTable.createdAt, today))),
    db.select({ c: count() }).from(ordersTable).where(eq(ordersTable.vendorId, vendorId)),
    db.select({ s: sum(ordersTable.total) }).from(ordersTable).where(and(eq(ordersTable.vendorId, vendorId), or(eq(ordersTable.status, "delivered"), eq(ordersTable.status, "completed")))),
    db.select({ c: count() }).from(productsTable).where(eq(productsTable.vendorId, vendorId)),
  ]);

  res.json({
    id: user.id, phone: user.phone, name: user.name, email: user.email,
    avatar: user.avatar, storeName: user.storeName || user.name,
    storeCategory: user.storeCategory || "General",
    walletBalance: parseFloat(user.walletBalance ?? "0"),
    stats: {
      ordersToday: todayOrders[0]?.c ?? 0,
      totalOrders: totalOrders[0]?.c ?? 0,
      totalRevenue: parseFloat(String(totalRevenue[0]?.s ?? "0")) * 0.85,
      totalProducts: productCount[0]?.c ?? 0,
    },
  });
});

/* ── PATCH /vendor/profile — Update vendor profile ── */
router.patch("/profile", async (req, res) => {
  const vendorId = (req as any).vendorId;
  const { name, email, storeName, storeCategory } = req.body;
  const updates: any = { updatedAt: new Date() };
  if (name)          updates.name          = name;
  if (email)         updates.email         = email;
  if (storeName)     updates.storeName     = storeName;
  if (storeCategory) updates.storeCategory = storeCategory;
  await db.update(usersTable).set(updates).where(eq(usersTable.id, vendorId));
  await db.update(productsTable).set({ vendorName: storeName || name, updatedAt: new Date() }).where(eq(productsTable.vendorId, vendorId)).catch(() => {});
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, vendorId)).limit(1);
  res.json({ id: user.id, name: user.name, phone: user.phone, email: user.email, storeName: user.storeName, storeCategory: user.storeCategory });
});

/* ── GET /vendor/stats ── */
router.get("/stats", async (req, res) => {
  const vendorId = (req as any).vendorId;
  const today = new Date(); today.setHours(0,0,0,0);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

  const [todayData, weekData, pendingOrders, totalProducts] = await Promise.all([
    db.select({ c: count(), s: sum(ordersTable.total) }).from(ordersTable).where(and(eq(ordersTable.vendorId, vendorId), gte(ordersTable.createdAt, today))),
    db.select({ c: count(), s: sum(ordersTable.total) }).from(ordersTable).where(and(eq(ordersTable.vendorId, vendorId), gte(ordersTable.createdAt, weekAgo))),
    db.select({ c: count() }).from(ordersTable).where(and(eq(ordersTable.vendorId, vendorId), eq(ordersTable.status, "pending"))),
    db.select({ c: count() }).from(productsTable).where(eq(productsTable.vendorId, vendorId)),
  ]);

  res.json({
    today:   { orders: todayData[0]?.c??0, revenue: parseFloat(String(todayData[0]?.s??0)) * 0.85 },
    week:    { orders: weekData[0]?.c??0,  revenue: parseFloat(String(weekData[0]?.s??0)) * 0.85 },
    pending: pendingOrders[0]?.c ?? 0,
    products: totalProducts[0]?.c ?? 0,
  });
});

/* ── GET /vendor/orders — Get orders for this vendor ── */
router.get("/orders", async (req, res) => {
  const vendorId = (req as any).vendorId;
  const status = req.query["status"] as string | undefined;
  const conditions: any[] = [eq(ordersTable.vendorId, vendorId)];
  if (status && status !== "all") conditions.push(eq(ordersTable.status, status));
  const orders = await db.select().from(ordersTable).where(and(...conditions)).orderBy(desc(ordersTable.createdAt)).limit(50);
  res.json({ orders: orders.map(o => ({ ...o, total: parseFloat(String(o.total)) })) });
});

/* ── PATCH /vendor/orders/:id/status — Update order status ── */
router.patch("/orders/:id/status", async (req, res) => {
  const vendorId = (req as any).vendorId;
  const { status } = req.body;
  const validStatuses = ["confirmed", "preparing", "ready", "cancelled"];
  if (!validStatuses.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
  const [order] = await db.select().from(ordersTable).where(and(eq(ordersTable.id, req.params["id"]!), eq(ordersTable.vendorId, vendorId))).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  const [updated] = await db.update(ordersTable).set({ status, updatedAt: new Date() }).where(eq(ordersTable.id, req.params["id"]!)).returning();
  const statusMessages: Record<string, { title: string; body: string; icon: string }> = {
    confirmed:  { title: "Order Confirmed! ✅", body: "Your order has been accepted by the store.", icon: "checkmark-circle-outline" },
    preparing:  { title: "Being Prepared 🍳", body: "The store is preparing your order.", icon: "restaurant-outline" },
    ready:      { title: "Order Ready! 📦", body: "Your order is ready for pickup.", icon: "bag-check-outline" },
    cancelled:  { title: "Order Cancelled ❌", body: "Your order was cancelled by the store.", icon: "close-circle-outline" },
  };
  if (statusMessages[status]) {
    const { title, body, icon } = statusMessages[status];
    await db.insert(notificationsTable).values({ id: generateId(), userId: order.userId, title, body, type: "order", icon }).catch(() => {});
  }
  if (status === "cancelled") {
    const refundAmt = parseFloat(String(order.total));
    if (order.paymentMethod === "wallet") {
      await db.update(usersTable).set({ walletBalance: sql`wallet_balance + ${refundAmt}`, updatedAt: new Date() }).where(eq(usersTable.id, order.userId));
      await db.insert(walletTransactionsTable).values({ id: generateId(), userId: order.userId, type: "credit", amount: String(refundAmt), description: `Refund — Order #${order.id.slice(-6).toUpperCase()} cancelled` }).catch(() => {});
    }
  }
  res.json({ ...updated, total: parseFloat(String(updated.total)) });
});

/* ── GET /vendor/products — Vendor's products ── */
router.get("/products", async (req, res) => {
  const vendorId = (req as any).vendorId;
  const products = await db.select().from(productsTable).where(eq(productsTable.vendorId, vendorId)).orderBy(desc(productsTable.createdAt));
  res.json({ products: products.map(p => ({ ...p, price: parseFloat(String(p.price)), originalPrice: p.originalPrice ? parseFloat(String(p.originalPrice)) : null, rating: parseFloat(String(p.rating ?? "4.0")) })) });
});

/* ── POST /vendor/products — Add product ── */
router.post("/products", async (req, res) => {
  const vendorId = (req as any).vendorId;
  const user = (req as any).vendorUser;
  const body = req.body;
  if (!body.name || !body.price || !body.category) { res.status(400).json({ error: "name, price, category required" }); return; }
  const [product] = await db.insert(productsTable).values({
    id: generateId(), vendorId, vendorName: user.storeName || user.name,
    name: body.name, description: body.description || null,
    price: String(body.price), originalPrice: body.originalPrice ? String(body.originalPrice) : null,
    category: body.category, type: body.type || "mart",
    image: body.image || null, inStock: body.inStock !== false,
    unit: body.unit || null, deliveryTime: body.deliveryTime || null,
  }).returning();
  res.status(201).json({ ...product, price: parseFloat(String(product.price)) });
});

/* ── PATCH /vendor/products/:id — Update product ── */
router.patch("/products/:id", async (req, res) => {
  const vendorId = (req as any).vendorId;
  const body = req.body;
  const updates: any = { updatedAt: new Date() };
  if (body.name        !== undefined) updates.name        = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.price       !== undefined) updates.price       = String(body.price);
  if (body.originalPrice !== undefined) updates.originalPrice = body.originalPrice ? String(body.originalPrice) : null;
  if (body.category    !== undefined) updates.category    = body.category;
  if (body.type        !== undefined) updates.type        = body.type;
  if (body.inStock     !== undefined) updates.inStock     = body.inStock;
  if (body.image       !== undefined) updates.image       = body.image;
  if (body.unit        !== undefined) updates.unit        = body.unit;
  if (body.deliveryTime !== undefined) updates.deliveryTime = body.deliveryTime;
  const [product] = await db.update(productsTable).set(updates).where(and(eq(productsTable.id, req.params["id"]!), eq(productsTable.vendorId, vendorId))).returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json({ ...product, price: parseFloat(String(product.price)) });
});

/* ── DELETE /vendor/products/:id — Delete product ── */
router.delete("/products/:id", async (req, res) => {
  const vendorId = (req as any).vendorId;
  await db.delete(productsTable).where(and(eq(productsTable.id, req.params["id"]!), eq(productsTable.vendorId, vendorId)));
  res.json({ success: true });
});

export default router;
