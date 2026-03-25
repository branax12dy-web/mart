import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { pharmacyOrdersTable, usersTable, walletTransactionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "../lib/id.js";

const router: IRouter = Router();

function mapOrder(o: typeof pharmacyOrdersTable.$inferSelect) {
  return {
    id: o.id,
    userId: o.userId,
    items: o.items as object[],
    prescriptionNote: o.prescriptionNote,
    deliveryAddress: o.deliveryAddress,
    contactPhone: o.contactPhone,
    total: parseFloat(o.total),
    paymentMethod: o.paymentMethod,
    status: o.status,
    estimatedTime: o.estimatedTime,
    createdAt: o.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const userId = req.query["userId"] as string;
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  const orders = await db
    .select()
    .from(pharmacyOrdersTable)
    .where(eq(pharmacyOrdersTable.userId, userId))
    .orderBy(pharmacyOrdersTable.createdAt);
  res.json({ orders: orders.map(mapOrder).reverse(), total: orders.length });
});

router.get("/:id", async (req, res) => {
  const [order] = await db
    .select()
    .from(pharmacyOrdersTable)
    .where(eq(pharmacyOrdersTable.id, req.params["id"]!))
    .limit(1);
  if (!order) {
    res.status(404).json({ error: "Pharmacy order not found" });
    return;
  }
  res.json(mapOrder(order));
});

router.post("/", async (req, res) => {
  const { userId, items, prescriptionNote, deliveryAddress, contactPhone, paymentMethod } = req.body;
  if (!userId || !items || !deliveryAddress || !contactPhone || !paymentMethod) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const total = (items as { price: number; quantity: number }[]).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
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
      description: "Pharmacy order payment",
    });
  }
  const [order] = await db
    .insert(pharmacyOrdersTable)
    .values({
      id: generateId(),
      userId,
      items,
      prescriptionNote: prescriptionNote || null,
      deliveryAddress,
      contactPhone,
      total: total.toString(),
      paymentMethod,
      status: "pending",
      estimatedTime: "25-40 min",
    })
    .returning();
  res.status(201).json(mapOrder(order!));
});

router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  const [order] = await db
    .update(pharmacyOrdersTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(pharmacyOrdersTable.id, req.params["id"]!))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Pharmacy order not found" });
    return;
  }
  res.json(mapOrder(order));
});

export default router;
