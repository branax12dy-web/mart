import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable, usersTable, walletTransactionsTable } from "@workspace/db/schema";
import { eq, and, SQL } from "drizzle-orm";
import { generateId } from "../lib/id.js";
import { getPlatformSettings } from "./admin.js";

const router: IRouter = Router();

function mapOrder(o: typeof ordersTable.$inferSelect) {
  return {
    id: o.id,
    userId: o.userId,
    type: o.type,
    items: o.items as object[],
    status: o.status,
    total: parseFloat(o.total),
    deliveryAddress: o.deliveryAddress,
    paymentMethod: o.paymentMethod,
    riderId: o.riderId,
    estimatedTime: o.estimatedTime,
    createdAt: o.createdAt.toISOString(),
  };
}

/* ── GET /orders?userId=&status= ─────────────────────────────────────────── */
router.get("/", async (req, res) => {
  const userId = req.query["userId"] as string;
  const status = req.query["status"] as string;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

  const conditions: SQL[] = [eq(ordersTable.userId, userId)];
  if (status) conditions.push(eq(ordersTable.status, status));
  const orders = await db.select().from(ordersTable).where(and(...conditions));
  res.json({ orders: orders.map(mapOrder), total: orders.length });
});

/* ── GET /orders/:id ──────────────────────────────────────────────────────── */
router.get("/:id", async (req, res) => {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params["id"]!)).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json(mapOrder(order));
});

/* ── POST /orders ─────────────────────────────────────────────────────────── */
router.post("/", async (req, res) => {
  const { userId, type, items, deliveryAddress, paymentMethod } = req.body;

  if (!userId || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "userId, items (array) required" }); return;
  }

  const total = items.reduce(
    (sum: number, item: { price: number; quantity: number }) => sum + (item.price * item.quantity),
    0
  );

  if (total <= 0) {
    res.status(400).json({ error: "Order total must be greater than 0" }); return;
  }

  // ── Platform settings validation ──────────────────────────────────────────
  const s = await getPlatformSettings();
  const minOrder = parseFloat(s["min_order_amount"] ?? "100");

  if (total < minOrder) {
    res.status(400).json({ error: `Minimum order amount is Rs. ${minOrder}` }); return;
  }

  /* ── COD validation ── */
  if (paymentMethod === "cash") {
    const codEnabled  = (s["cod_enabled"] ?? "on") === "on";
    if (!codEnabled) {
      res.status(400).json({ error: "Cash on Delivery is currently not available" }); return;
    }
    const codMax = parseFloat(s["cod_max_amount"] ?? "5000");
    if (total > codMax) {
      res.status(400).json({ error: `Maximum Cash on Delivery order is Rs. ${codMax}. Please pay online for larger orders.` }); return;
    }
  }

  /* ── Wallet payment: deduct on placement (single deduction — NOT on delivery) ── */
  if (paymentMethod === "wallet") {
    const walletEnabled = (s["feature_wallet"] ?? "on") === "on";
    if (!walletEnabled) {
      res.status(400).json({ error: "Wallet payments are currently disabled" }); return;
    }

    // Use a DB transaction to prevent race condition / double-spend
    try {
      const order = await db.transaction(async (tx) => {
        const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
        if (!user) throw new Error("User not found");

        const balance = parseFloat(user.walletBalance ?? "0");
        if (balance < total) throw new Error(`Insufficient wallet balance. Balance: Rs. ${balance.toFixed(0)}, Required: Rs. ${total.toFixed(0)}`);

        const newBalance = (balance - total).toFixed(2);
        await tx.update(usersTable).set({ walletBalance: newBalance }).where(eq(usersTable.id, userId));
        await tx.insert(walletTransactionsTable).values({
          id: generateId(), userId, type: "debit",
          amount: total.toFixed(2),
          description: `Order payment (${type || "mart"}) — Rs. ${total.toFixed(0)}`,
        });

        const [newOrder] = await tx.insert(ordersTable).values({
          id: generateId(), userId, type, items,
          status: "pending", total: total.toFixed(2),
          deliveryAddress, paymentMethod,
          estimatedTime: "30-45 min",
        }).returning();
        return newOrder!;
      });
      res.status(201).json(mapOrder(order));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
    return;
  }

  /* ── Cash / JazzCash / EasyPaisa / Bank — no wallet deduction at placement ── */
  const [order] = await db.insert(ordersTable).values({
    id: generateId(), userId, type, items,
    status: "pending", total: total.toFixed(2),
    deliveryAddress, paymentMethod,
    estimatedTime: "30-45 min",
  }).returning();
  res.status(201).json(mapOrder(order!));
});

/* ── PATCH /orders/:id ────────────────────────────────────────────────────── */
router.patch("/:id", async (req, res) => {
  const { status, riderId } = req.body;
  const updateData: Partial<typeof ordersTable.$inferInsert> = { status, updatedAt: new Date() };
  if (riderId) updateData.riderId = riderId;

  const [order] = await db.update(ordersTable)
    .set(updateData)
    .where(eq(ordersTable.id, req.params["id"]!))
    .returning();
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json(mapOrder(order));
});

export default router;
