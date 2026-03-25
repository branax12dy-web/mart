import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable, usersTable, walletTransactionsTable } from "@workspace/db/schema";
import { eq, and, SQL } from "drizzle-orm";
import { generateId } from "../lib/id.js";

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

router.get("/", async (req, res) => {
  const userId = req.query["userId"] as string;
  const status = req.query["status"] as string;
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  const conditions: SQL[] = [eq(ordersTable.userId, userId)];
  if (status) conditions.push(eq(ordersTable.status, status));
  const orders = await db.select().from(ordersTable).where(and(...conditions));
  res.json({ orders: orders.map(mapOrder), total: orders.length });
});

router.get("/:id", async (req, res) => {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params["id"]!)).limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(mapOrder(order));
});

router.post("/", async (req, res) => {
  const { userId, type, items, deliveryAddress, paymentMethod } = req.body;
  const total = items.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0);
  if (paymentMethod === "wallet") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user || parseFloat(user.walletBalance ?? "0") < total) {
      res.status(400).json({ error: "Insufficient wallet balance" });
      return;
    }
    const newBalance = (parseFloat(user.walletBalance ?? "0") - total).toString();
    await db.update(usersTable).set({ walletBalance: newBalance }).where(eq(usersTable.id, userId));
    await db.insert(walletTransactionsTable).values({
      id: generateId(),
      userId,
      type: "debit",
      amount: total.toString(),
      description: `Order payment - ${type}`,
    });
  }
  const [order] = await db.insert(ordersTable).values({
    id: generateId(),
    userId,
    type,
    items,
    status: "pending",
    total: total.toString(),
    deliveryAddress,
    paymentMethod,
    estimatedTime: "30-45 min",
  }).returning();
  res.status(201).json(mapOrder(order!));
});

router.patch("/:id", async (req, res) => {
  const { status, riderId } = req.body;
  const updateData: Partial<typeof ordersTable.$inferInsert> = { status, updatedAt: new Date() };
  if (riderId) updateData.riderId = riderId;
  const [order] = await db.update(ordersTable).set(updateData).where(eq(ordersTable.id, req.params["id"]!)).returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(mapOrder(order));
});

export default router;
