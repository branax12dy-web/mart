import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notificationsTable, ridesTable, usersTable, walletTransactionsTable } from "@workspace/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { generateId } from "../lib/id.js";
import { getPlatformSettings } from "./admin.js";

const router: IRouter = Router();

/* ── Haversine distance (km) ── */
function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function calcFare(distance: number, type: string): Promise<{ baseFare: number; gstAmount: number; total: number }> {
  const s = await getPlatformSettings();
  const baseRate = type === "bike" ? parseFloat(s["ride_bike_base_fare"] ?? "15") : parseFloat(s["ride_car_base_fare"] ?? "25");
  const perKm    = type === "bike" ? parseFloat(s["ride_bike_per_km"]    ?? "8")  : parseFloat(s["ride_car_per_km"]   ?? "12");
  const minFare  = type === "bike" ? parseFloat(s["ride_bike_min_fare"]  ?? "50") : parseFloat(s["ride_car_min_fare"] ?? "80");
  const surgeEnabled    = (s["ride_surge_enabled"] ?? "off") === "on";
  const surgeMultiplier = surgeEnabled ? parseFloat(s["ride_surge_multiplier"] ?? "1.5") : 1;
  const raw = Math.round(baseRate + distance * perKm);
  const baseFare = Math.round(Math.max(minFare, raw) * surgeMultiplier);
  const gstEnabled = (s["finance_gst_enabled"] ?? "off") === "on";
  const gstPct     = parseFloat(s["finance_gst_pct"] ?? "17");
  const gstAmount  = gstEnabled ? parseFloat(((baseFare * gstPct) / 100).toFixed(2)) : 0;
  return { baseFare, gstAmount, total: baseFare + gstAmount };
}

function formatRide(r: any) {
  return {
    ...r,
    fare:        parseFloat(r.fare         ?? "0"),
    distance:    parseFloat(r.distance     ?? "0"),
    offeredFare: r.offeredFare  ? parseFloat(r.offeredFare)  : null,
    counterFare: r.counterFare  ? parseFloat(r.counterFare)  : null,
    bargainRounds: r.bargainRounds ?? 0,
    createdAt:   r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt:   r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
    acceptedAt:  r.acceptedAt   ? (r.acceptedAt instanceof Date ? r.acceptedAt.toISOString() : r.acceptedAt) : null,
  };
}

/* ══════════════════════════════════════════════════════
   POST /rides/estimate — Fare estimate (server-side, incl. GST)
══════════════════════════════════════════════════════ */
router.post("/estimate", async (req, res) => {
  const { pickupLat, pickupLng, dropLat, dropLng, type } = req.body;
  if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
    res.status(400).json({ error: "pickupLat, pickupLng, dropLat, dropLng required" }); return;
  }
  const distance = calcDistance(Number(pickupLat), Number(pickupLng), Number(dropLat), Number(dropLng));
  const { baseFare, gstAmount, total } = await calcFare(distance, type || "bike");
  const s = await getPlatformSettings();
  const duration = `${Math.round(distance * 3 + 5)} min`;
  const bargainEnabled = (s["ride_bargaining_enabled"] ?? "on") === "on";
  const bargainMinPct  = parseFloat(s["ride_bargaining_min_pct"] ?? "70");
  const minOffer       = Math.ceil(total * (bargainMinPct / 100));
  res.json({
    distance:    Math.round(distance * 10) / 10,
    baseFare,
    gstAmount,
    fare:        total,
    duration,
    type:        type || "bike",
    bargainEnabled,
    minOffer,
  });
});

/* ══════════════════════════════════════════════════════
   POST /rides — Book a ride (standard or bargaining)
══════════════════════════════════════════════════════ */
router.post("/", async (req, res) => {
  const {
    userId, type, pickupAddress, dropAddress,
    pickupLat, pickupLng, dropLat, dropLng,
    paymentMethod,
    offeredFare,   /* bargaining: customer's custom price offer */
    bargainNote,   /* bargaining: optional note */
  } = req.body;

  if (!userId || !type || !paymentMethod) {
    res.status(400).json({ error: "userId, type, and paymentMethod are required" }); return;
  }
  if (!pickupAddress || !dropAddress) {
    res.status(400).json({ error: "pickupAddress and dropAddress are required" }); return;
  }
  if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
    res.status(400).json({ error: "Exact coordinates required. Please select pickup/drop from the location list." }); return;
  }

  const s = await getPlatformSettings();

  if ((s["app_status"] ?? "active") === "maintenance") {
    const mainKey = (s["security_maintenance_key"] ?? "").trim();
    const bypass  = ((req.headers["x-maintenance-key"] as string) ?? "").trim();
    if (!mainKey || bypass !== mainKey) {
      res.status(503).json({ error: s["content_maintenance_msg"] ?? "We're performing scheduled maintenance. Back soon!" }); return;
    }
  }

  const ridesEnabled = (s["feature_rides"] ?? "on") === "on";
  if (!ridesEnabled) { res.status(503).json({ error: "Ride booking is currently disabled" }); return; }

  const distance = calcDistance(Number(pickupLat), Number(pickupLng), Number(dropLat), Number(dropLng));
  const { baseFare, gstAmount, total: platformFare } = await calcFare(distance, type);

  /* ── Bargaining logic ── */
  const bargainEnabled  = (s["ride_bargaining_enabled"] ?? "on") === "on";
  const bargainMinPct   = parseFloat(s["ride_bargaining_min_pct"] ?? "70");
  const bargainMaxRound = parseInt(s["ride_bargaining_max_rounds"] ?? "3", 10);

  let isBargaining = false;
  let validatedOffer = 0;

  if (offeredFare !== undefined && offeredFare !== null && bargainEnabled) {
    validatedOffer = parseFloat(String(offeredFare));
    if (isNaN(validatedOffer) || validatedOffer <= 0) {
      res.status(400).json({ error: "Invalid offered fare" }); return;
    }
    const minOffer = Math.ceil(platformFare * (bargainMinPct / 100));
    if (validatedOffer < minOffer) {
      res.status(400).json({ error: `Minimum offer allowed is Rs. ${minOffer} (${bargainMinPct}% of platform fare)` }); return;
    }
    if (validatedOffer >= platformFare) {
      isBargaining = false;  /* offered >= platform price → just use platform price */
    } else {
      isBargaining = true;
    }
  }

  /* ── Online payment limits ── */
  const minOnline = parseFloat(s["payment_min_online"] ?? "50");
  const maxOnline = parseFloat(s["payment_max_online"] ?? "100000");
  const effectiveFare = isBargaining ? validatedOffer : platformFare;
  if (paymentMethod === "wallet" && (effectiveFare < minOnline || effectiveFare > maxOnline)) {
    res.status(400).json({ error: `Wallet payment must be between Rs. ${minOnline} and Rs. ${maxOnline}` }); return;
  }

  if (paymentMethod === "cash") {
    const riderCashAllowed = (s["rider_cash_allowed"] ?? "on") === "on";
    if (!riderCashAllowed) {
      res.status(400).json({ error: "Cash payment is currently not available for rides. Please use wallet." }); return;
    }
  }

  const rideStatus = isBargaining ? "bargaining" : "searching";
  const fareToCharge = isBargaining ? validatedOffer : platformFare;
  const fareToStore  = platformFare.toFixed(2);  /* always store platform fare; bargaining tracks offered separately */

  /* ── Wallet: deduct immediately only for non-bargaining (platform price accepted) ── */
  try {
    let rideRecord: any;

    if (paymentMethod === "wallet" && !isBargaining) {
      const walletEnabled = (s["feature_wallet"] ?? "on") === "on";
      if (!walletEnabled) { res.status(400).json({ error: "Wallet payments are currently disabled" }); return; }

      rideRecord = await db.transaction(async (tx) => {
        const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
        if (!user) throw new Error("User not found");
        const balance = parseFloat(user.walletBalance ?? "0");
        if (balance < fareToCharge) throw new Error(`Insufficient wallet balance. Balance: Rs. ${balance.toFixed(0)}, Required: Rs. ${fareToCharge.toFixed(0)}`);
        await tx.update(usersTable).set({ walletBalance: (balance - fareToCharge).toFixed(2) }).where(eq(usersTable.id, userId));
        await tx.insert(walletTransactionsTable).values({
          id: generateId(), userId, type: "debit",
          amount: fareToCharge.toFixed(2),
          description: `${type === "bike" ? "Bike" : "Car"} ride payment`,
        });
        const [ride] = await tx.insert(ridesTable).values({
          id: generateId(), userId, type, status: rideStatus,
          pickupAddress, dropAddress,
          pickupLat: String(pickupLat), pickupLng: String(pickupLng),
          dropLat: String(dropLat), dropLng: String(dropLng),
          fare: fareToStore, distance: (Math.round(distance * 10) / 10).toString(), paymentMethod,
          offeredFare: null, counterFare: null, bargainStatus: null, bargainRounds: 0,
        }).returning();
        return ride!;
      });
    } else {
      /* Cash payment OR bargaining ride (wallet deducted on agreement) */
      const [ride] = await db.insert(ridesTable).values({
        id: generateId(), userId, type, status: rideStatus,
        pickupAddress, dropAddress,
        pickupLat: String(pickupLat), pickupLng: String(pickupLng),
        dropLat: String(dropLat), dropLng: String(dropLng),
        fare: fareToStore, distance: (Math.round(distance * 10) / 10).toString(), paymentMethod,
        offeredFare:   isBargaining ? validatedOffer.toFixed(2) : null,
        counterFare:   null,
        bargainStatus: isBargaining ? "customer_offered" : null,
        bargainRounds: isBargaining ? 1 : 0,
        bargainNote:   bargainNote || null,
      }).returning();
      rideRecord = ride!;
    }

    /* Notification */
    await db.insert(notificationsTable).values({
      id: generateId(), userId,
      title: isBargaining ? `Ride Offer Sent 💬` : `${type === "bike" ? "Bike" : "Car"} Ride Booked`,
      body: isBargaining
        ? `Aapka Rs. ${validatedOffer} ka offer send ho gaya. Rider respond karega.`
        : `Aapki ride book ho gayi. Rider dhundha ja raha hai. Fare: Rs. ${fareToCharge.toFixed(0)}`,
      type: "ride", icon: type === "bike" ? "bicycle-outline" : "car-outline", link: `/ride`,
    }).catch(() => {});

    res.status(201).json({
      ...formatRide(rideRecord),
      baseFare, gstAmount,
      platformFare, effectiveFare: fareToCharge,
      isBargaining,
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/* ══════════════════════════════════════════════════════
   PATCH /rides/:id/cancel — Customer cancels a ride
══════════════════════════════════════════════════════ */
router.patch("/:id/cancel", async (req, res) => {
  const { userId } = req.body;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

  const [ride] = await db.select().from(ridesTable).where(eq(ridesTable.id, req.params["id"]!)).limit(1);
  if (!ride) { res.status(404).json({ error: "Ride not found" }); return; }
  if (ride.userId !== userId) { res.status(403).json({ error: "Not your ride" }); return; }
  if (!["searching", "bargaining", "accepted", "arrived", "in_transit"].includes(ride.status)) {
    res.status(400).json({ error: "Ride cannot be cancelled at this stage" }); return;
  }

  const s = await getPlatformSettings();
  const cancelFee = parseFloat(s["ride_cancellation_fee"] ?? "30");
  const riderAssigned = ["accepted", "arrived", "in_transit"].includes(ride.status);

  /* Cancellation fee only if rider was assigned */
  let actualCancelFee = 0;
  if (riderAssigned && cancelFee > 0 && ride.paymentMethod === "wallet") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user) {
      const balance = parseFloat(user.walletBalance ?? "0");
      actualCancelFee = Math.min(cancelFee, balance);
      if (actualCancelFee > 0) {
        await db.update(usersTable)
          .set({ walletBalance: (balance - actualCancelFee).toFixed(2) })
          .where(eq(usersTable.id, userId));
        await db.insert(walletTransactionsTable).values({
          id: generateId(), userId, type: "debit",
          amount: actualCancelFee.toFixed(2),
          description: `Ride cancellation fee — #${ride.id.slice(-6).toUpperCase()}`,
        }).catch(() => {});
      }
    }
  }

  const [updated] = await db.update(ridesTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(ridesTable.id, req.params["id"]!))
    .returning();

  /* Refund wallet fare if wallet payment + not bargaining (bargaining rides haven't charged yet) */
  if (ride.paymentMethod === "wallet" && ride.status !== "bargaining" && ride.bargainStatus !== "customer_offered") {
    const refundAmt = parseFloat(ride.fare);
    await db.update(usersTable)
      .set({ walletBalance: sql`wallet_balance + ${refundAmt}`, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));
    await db.insert(walletTransactionsTable).values({
      id: generateId(), userId, type: "credit", amount: refundAmt.toFixed(2),
      description: `Ride refund — #${ride.id.slice(-6).toUpperCase()} cancelled`,
    }).catch(() => {});
    await db.insert(notificationsTable).values({
      id: generateId(), userId,
      title: "Ride Refund 💰",
      body: `Rs. ${refundAmt.toFixed(0)} refunded to your wallet.${actualCancelFee > 0 ? ` Rs. ${actualCancelFee} cancellation fee applied.` : ""}`,
      type: "ride", icon: "wallet-outline",
    }).catch(() => {});
  } else if (ride.status === "bargaining" || ride.bargainStatus === "customer_offered") {
    await db.insert(notificationsTable).values({
      id: generateId(), userId,
      title: "Ride Offer Cancelled",
      body: "Aapka ride offer cancel ho gaya.",
      type: "ride", icon: "close-circle-outline",
    }).catch(() => {});
  } else {
    await db.insert(notificationsTable).values({
      id: generateId(), userId,
      title: "Ride Cancelled",
      body: riderAssigned && cancelFee > 0 ? `A cancellation fee of Rs. ${cancelFee} has been applied.` : "Aapki ride cancel ho gayi.",
      type: "ride", icon: "close-circle-outline",
    }).catch(() => {});
  }

  res.json({
    ...formatRide(updated!),
    cancellationFee: actualCancelFee,
  });
});

/* ══════════════════════════════════════════════════════
   PATCH /rides/:id/accept-counter — Customer accepts rider's counter offer
══════════════════════════════════════════════════════ */
router.patch("/:id/accept-counter", async (req, res) => {
  const { userId } = req.body;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

  const [ride] = await db.select().from(ridesTable).where(eq(ridesTable.id, req.params["id"]!)).limit(1);
  if (!ride) { res.status(404).json({ error: "Ride not found" }); return; }
  if (ride.userId !== userId) { res.status(403).json({ error: "Not your ride" }); return; }
  if (ride.bargainStatus !== "rider_countered") {
    res.status(400).json({ error: "No rider counter offer to accept" }); return;
  }

  const agreedFare = parseFloat(ride.counterFare ?? ride.fare);

  /* If wallet payment, deduct now */
  if (ride.paymentMethod === "wallet") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const balance = parseFloat(user.walletBalance ?? "0");
    if (balance < agreedFare) {
      res.status(400).json({ error: `Insufficient wallet balance. Need Rs. ${agreedFare.toFixed(0)}` }); return;
    }
    await db.update(usersTable).set({ walletBalance: (balance - agreedFare).toFixed(2) }).where(eq(usersTable.id, userId));
    await db.insert(walletTransactionsTable).values({
      id: generateId(), userId, type: "debit", amount: agreedFare.toFixed(2),
      description: `Ride payment (bargained) — #${ride.id.slice(-6).toUpperCase()}`,
    }).catch(() => {});
  }

  const [updated] = await db.update(ridesTable)
    .set({
      status: "searching", /* now open for riders to accept at agreed price */
      fare: agreedFare.toFixed(2),
      bargainStatus: "agreed",
      offeredFare: agreedFare.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(ridesTable.id, req.params["id"]!))
    .returning();

  /* Notify rider who countered */
  if (ride.riderId) {
    await db.insert(notificationsTable).values({
      id: generateId(), userId: ride.riderId,
      title: "Customer ne Counter Accept Kiya! 🎉",
      body: `Rs. ${agreedFare.toFixed(0)} ke fare par saudaa ho gaya.`,
      type: "ride", icon: "checkmark-circle-outline",
    }).catch(() => {});
  }

  res.json({ ...formatRide(updated!), agreedFare });
});

/* ══════════════════════════════════════════════════════
   PATCH /rides/:id/customer-counter — Customer sends a new counter offer
══════════════════════════════════════════════════════ */
router.patch("/:id/customer-counter", async (req, res) => {
  const { userId, offeredFare: newOffer, note } = req.body;
  if (!userId || !newOffer) { res.status(400).json({ error: "userId and offeredFare required" }); return; }

  const [ride] = await db.select().from(ridesTable).where(eq(ridesTable.id, req.params["id"]!)).limit(1);
  if (!ride) { res.status(404).json({ error: "Ride not found" }); return; }
  if (ride.userId !== userId) { res.status(403).json({ error: "Not your ride" }); return; }
  if (ride.bargainStatus !== "rider_countered") {
    res.status(400).json({ error: "Can only counter when rider has sent a counter offer" }); return;
  }

  const s = await getPlatformSettings();
  const bargainMaxRound = parseInt(s["ride_bargaining_max_rounds"] ?? "3", 10);
  const bargainMinPct   = parseFloat(s["ride_bargaining_min_pct"] ?? "70");
  const currentRounds   = ride.bargainRounds ?? 0;

  if (currentRounds >= bargainMaxRound) {
    res.status(400).json({ error: `Maximum ${bargainMaxRound} bargaining rounds allowed. Please accept or decline.` }); return;
  }

  const platformFare = parseFloat(ride.fare);
  const parsedOffer  = parseFloat(String(newOffer));
  const minOffer     = Math.ceil(platformFare * (bargainMinPct / 100));
  if (parsedOffer < minOffer) {
    res.status(400).json({ error: `Minimum offer is Rs. ${minOffer}` }); return;
  }

  const [updated] = await db.update(ridesTable)
    .set({
      offeredFare:   parsedOffer.toFixed(2),
      counterFare:   null,
      bargainStatus: "customer_countered",
      bargainRounds: currentRounds + 1,
      bargainNote:   note || ride.bargainNote,
      status:        "bargaining",
      updatedAt:     new Date(),
    })
    .where(eq(ridesTable.id, req.params["id"]!))
    .returning();

  /* Notify the rider who countered */
  if (ride.riderId) {
    await db.insert(notificationsTable).values({
      id: generateId(), userId: ride.riderId,
      title: "Customer ne Counter Kiya 💬",
      body: `Customer ka naya offer: Rs. ${parsedOffer.toFixed(0)}`,
      type: "ride", icon: "chatbubble-outline",
    }).catch(() => {});
  }

  res.json(formatRide(updated!));
});

/* ══════════════════════════════════════════════════════
   GET /rides — List rides for user
══════════════════════════════════════════════════════ */
router.get("/", async (req, res) => {
  const userId = req.query["userId"] as string;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  const rides = await db.select().from(ridesTable).where(eq(ridesTable.userId, userId)).orderBy(ridesTable.createdAt);
  res.json({
    rides: rides.map(formatRide).reverse(),
    total: rides.length,
  });
});

/* ══════════════════════════════════════════════════════
   GET /rides/:id — Single ride details (with rider name join)
══════════════════════════════════════════════════════ */
router.get("/:id", async (req, res) => {
  const [ride] = await db.select().from(ridesTable).where(eq(ridesTable.id, req.params["id"]!)).limit(1);
  if (!ride) { res.status(404).json({ error: "Ride not found" }); return; }

  /* Enrich with rider info if riderId set but riderName not stored */
  let riderName = ride.riderName;
  let riderPhone = ride.riderPhone;
  if (ride.riderId && !riderName) {
    const [riderUser] = await db.select({ name: usersTable.name, phone: usersTable.phone })
      .from(usersTable).where(eq(usersTable.id, ride.riderId)).limit(1);
    riderName  = riderUser?.name  || null;
    riderPhone = riderUser?.phone || null;
  }

  res.json({ ...formatRide(ride), riderName, riderPhone });
});

export default router;
