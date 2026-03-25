import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { parcelBookingsTable, usersTable, walletTransactionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "../lib/id.js";

const router: IRouter = Router();

const PARCEL_FARES: Record<string, number> = {
  document: 150,
  clothes: 200,
  electronics: 350,
  food: 180,
  other: 250,
};

function calcParcelFare(type: string, weight?: number): number {
  const base = PARCEL_FARES[type] ?? 250;
  const weightCharge = weight && weight > 2 ? Math.round((weight - 2) * 40) : 0;
  return base + weightCharge;
}

function mapBooking(b: typeof parcelBookingsTable.$inferSelect) {
  return {
    id: b.id,
    userId: b.userId,
    senderName: b.senderName,
    senderPhone: b.senderPhone,
    pickupAddress: b.pickupAddress,
    receiverName: b.receiverName,
    receiverPhone: b.receiverPhone,
    dropAddress: b.dropAddress,
    parcelType: b.parcelType,
    weight: b.weight ? parseFloat(b.weight) : null,
    description: b.description,
    fare: parseFloat(b.fare),
    paymentMethod: b.paymentMethod,
    status: b.status,
    estimatedTime: b.estimatedTime,
    riderId: b.riderId,
    createdAt: b.createdAt.toISOString(),
  };
}

router.post("/estimate", (req, res) => {
  const { parcelType, weight } = req.body;
  const fare = calcParcelFare(parcelType, weight);
  res.json({ fare, estimatedTime: "45-60 min", parcelType });
});

router.get("/", async (req, res) => {
  const userId = req.query["userId"] as string;
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  const bookings = await db
    .select()
    .from(parcelBookingsTable)
    .where(eq(parcelBookingsTable.userId, userId))
    .orderBy(parcelBookingsTable.createdAt);
  res.json({ bookings: bookings.map(mapBooking).reverse(), total: bookings.length });
});

router.get("/:id", async (req, res) => {
  const [booking] = await db
    .select()
    .from(parcelBookingsTable)
    .where(eq(parcelBookingsTable.id, req.params["id"]!))
    .limit(1);
  if (!booking) {
    res.status(404).json({ error: "Parcel booking not found" });
    return;
  }
  res.json(mapBooking(booking));
});

router.post("/", async (req, res) => {
  const {
    userId, senderName, senderPhone, pickupAddress,
    receiverName, receiverPhone, dropAddress,
    parcelType, weight, description, paymentMethod,
  } = req.body;
  if (!userId || !senderName || !senderPhone || !pickupAddress || !receiverName || !receiverPhone || !dropAddress || !parcelType || !paymentMethod) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const fare = calcParcelFare(parcelType, weight);
  if (paymentMethod === "wallet") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user || parseFloat(user.walletBalance ?? "0") < fare) {
      res.status(400).json({ error: "Insufficient wallet balance" });
      return;
    }
    const newBalance = (parseFloat(user.walletBalance ?? "0") - fare).toString();
    await db.update(usersTable).set({ walletBalance: newBalance }).where(eq(usersTable.id, userId));
    await db.insert(walletTransactionsTable).values({
      id: generateId(),
      userId,
      type: "debit",
      amount: fare.toString(),
      description: `Parcel delivery - ${parcelType}`,
    });
  }
  const [booking] = await db
    .insert(parcelBookingsTable)
    .values({
      id: generateId(),
      userId,
      senderName,
      senderPhone,
      pickupAddress,
      receiverName,
      receiverPhone,
      dropAddress,
      parcelType,
      weight: weight ? weight.toString() : null,
      description: description || null,
      fare: fare.toString(),
      paymentMethod,
      status: "pending",
      estimatedTime: "45-60 min",
    })
    .returning();
  res.status(201).json(mapBooking(booking!));
});

router.patch("/:id/status", async (req, res) => {
  const { status, riderId } = req.body;
  const updateData: Partial<typeof parcelBookingsTable.$inferInsert> = { status, updatedAt: new Date() };
  if (riderId) updateData.riderId = riderId;
  const [booking] = await db
    .update(parcelBookingsTable)
    .set(updateData)
    .where(eq(parcelBookingsTable.id, req.params["id"]!))
    .returning();
  if (!booking) {
    res.status(404).json({ error: "Parcel booking not found" });
    return;
  }
  res.json(mapBooking(booking));
});

export default router;
