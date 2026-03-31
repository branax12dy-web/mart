import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable, pharmacyOrdersTable, parcelBookingsTable, reviewsTable, rideRatingsTable, ridesTable, usersTable } from "@workspace/db/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { generateId } from "../lib/id.js";
import { getPlatformSettings } from "./admin.js";
import { customerAuth } from "../middleware/security.js";

const router: IRouter = Router();

/* ── POST /reviews — submit a review ─────────────────────────────────────── */
router.post("/", customerAuth, async (req, res) => {
  const userId = req.customerId!;
  const { orderId, vendorId, riderId, orderType, rating, riderRating, comment } = req.body;

  if (!orderId || !orderType || !rating) {
    res.status(400).json({ error: "orderId, orderType, and rating are required" });
    return;
  }
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    res.status(400).json({ error: "rating must be 1–5" });
    return;
  }
  if (riderRating !== undefined && riderRating !== null) {
    if (typeof riderRating !== "number" || riderRating < 1 || riderRating > 5) {
      res.status(400).json({ error: "riderRating must be 1–5" });
      return;
    }
  }

  /* ── Feature gate: admin can disable reviews globally ── */
  const s = await getPlatformSettings();
  const reviewsEnabled = (s["feature_reviews"] ?? "on") === "on";
  if (!reviewsEnabled) {
    res.status(503).json({ error: "Customer reviews are currently disabled." });
    return;
  }

  /* ── Rating window enforcement + IDOR protection + authoritative subject derivation ──
     We derive vendorId and riderId from the DB row (not from client-supplied values)
     to prevent subject-spoofing. A client can only review the subjects actually
     associated with their order/ride. Client-supplied IDs are only used as a signal
     of intent (e.g. dual-rating) but the persisted value is always the DB-authoritative one. */
  const ratingWindowHours = parseFloat(s["order_rating_window_hours"] ?? "48");

  /* Resolved subjects — set from DB, not from request body */
  let authoritativeRiderId: string | null = null;
  let authoritativeVendorId: string | null = null;

  if (orderType === "ride") {
    const [rideRow] = await db
      .select({ createdAt: ridesTable.createdAt, userId: ridesTable.userId, riderId: ridesTable.riderId })
      .from(ridesTable)
      .where(eq(ridesTable.id, orderId))
      .limit(1);

    if (!rideRow) {
      res.status(404).json({ error: "Ride not found." });
      return;
    }
    if (rideRow.userId !== userId) {
      res.status(403).json({ error: "You can only review your own rides." });
      return;
    }
    /* Self-rating guard */
    if (rideRow.riderId && rideRow.riderId === userId) {
      res.status(403).json({ error: "You cannot rate yourself." });
      return;
    }
    const ageHours = (Date.now() - new Date(rideRow.createdAt).getTime()) / (3_600_000);
    if (ageHours > ratingWindowHours) {
      res.status(400).json({ error: `Reviews can only be submitted within ${ratingWindowHours} hours of completion.`, expired: true, ratingWindowHours });
      return;
    }
    authoritativeRiderId = rideRow.riderId ?? null;

  } else if (orderType === "pharmacy") {
    const [row] = await db
      .select({ createdAt: pharmacyOrdersTable.createdAt, userId: pharmacyOrdersTable.userId, riderId: pharmacyOrdersTable.riderId })
      .from(pharmacyOrdersTable)
      .where(eq(pharmacyOrdersTable.id, orderId))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Pharmacy order not found." });
      return;
    }
    if (row.userId !== userId) {
      res.status(403).json({ error: "You can only review your own orders." });
      return;
    }
    const ageHours = (Date.now() - new Date(row.createdAt).getTime()) / (3_600_000);
    if (ageHours > ratingWindowHours) {
      res.status(400).json({ error: `Reviews can only be submitted within ${ratingWindowHours} hours of order completion.`, expired: true, ratingWindowHours });
      return;
    }
    authoritativeRiderId = row.riderId ?? null;

  } else if (orderType === "parcel") {
    const [row] = await db
      .select({ createdAt: parcelBookingsTable.createdAt, userId: parcelBookingsTable.userId, riderId: parcelBookingsTable.riderId })
      .from(parcelBookingsTable)
      .where(eq(parcelBookingsTable.id, orderId))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Parcel booking not found." });
      return;
    }
    if (row.userId !== userId) {
      res.status(403).json({ error: "You can only review your own bookings." });
      return;
    }
    const ageHours = (Date.now() - new Date(row.createdAt).getTime()) / (3_600_000);
    if (ageHours > ratingWindowHours) {
      res.status(400).json({ error: `Reviews can only be submitted within ${ratingWindowHours} hours of completion.`, expired: true, ratingWindowHours });
      return;
    }
    authoritativeRiderId = row.riderId ?? null;

  } else {
    /* Mart / food / general delivery — all in ordersTable */
    const [orderRow] = await db
      .select({ createdAt: ordersTable.createdAt, userId: ordersTable.userId, vendorId: ordersTable.vendorId, riderId: ordersTable.riderId })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (!orderRow) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    if (orderRow.userId !== userId) {
      res.status(403).json({ error: "You can only review your own orders." });
      return;
    }
    const ageHours = (Date.now() - new Date(orderRow.createdAt).getTime()) / (3_600_000);
    if (ageHours > ratingWindowHours) {
      res.status(400).json({ error: `Reviews can only be submitted within ${ratingWindowHours} hours of order completion.`, expired: true, ratingWindowHours });
      return;
    }
    /* Derive subjects from DB — never from request body */
    authoritativeVendorId = orderRow.vendorId ?? null;
    authoritativeRiderId  = orderRow.riderId ?? null;
  }

  /* Self-rating guard (non-ride types) */
  if (authoritativeRiderId && authoritativeRiderId === userId) {
    res.status(403).json({ error: "You cannot rate yourself." });
    return;
  }

  const existing = await db
    .select({ id: reviewsTable.id })
    .from(reviewsTable)
    .where(and(eq(reviewsTable.orderId, orderId), eq(reviewsTable.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Already reviewed", alreadyReviewed: true });
    return;
  }

  /* Use authoritative subjects from DB, not client-supplied IDs */
  const [review] = await db.insert(reviewsTable).values({
    id: generateId(),
    orderId,
    userId,
    vendorId: authoritativeVendorId,
    riderId:  authoritativeRiderId,
    orderType,
    rating,
    riderRating: (authoritativeRiderId && riderRating) ? riderRating : null,
    comment: comment ?? null,
  }).returning();

  res.status(201).json(review);
});

/* ── GET /reviews?orderId= — check if reviewed (IDOR-protected) ── */
router.get("/", customerAuth, async (req, res) => {
  const userId  = req.customerId!;
  const orderId = req.query["orderId"] as string;
  const type    = (req.query["type"] as string) ?? "order"; // "ride" | "order"
  if (!orderId) { res.status(400).json({ error: "orderId required" }); return; }

  /* Ownership gate: verify the caller owns this order/ride before revealing review status.
     Without this check a caller can enumerate review states for arbitrary IDs. */
  let owned = false;
  if (type === "ride") {
    const [row] = await db.select({ userId: ridesTable.userId }).from(ridesTable).where(eq(ridesTable.id, orderId)).limit(1);
    owned = !!row && row.userId === userId;
  } else if (type === "pharmacy") {
    const [row] = await db.select({ userId: pharmacyOrdersTable.userId }).from(pharmacyOrdersTable).where(eq(pharmacyOrdersTable.id, orderId)).limit(1);
    owned = !!row && row.userId === userId;
  } else if (type === "parcel") {
    const [row] = await db.select({ userId: parcelBookingsTable.userId }).from(parcelBookingsTable).where(eq(parcelBookingsTable.id, orderId)).limit(1);
    owned = !!row && row.userId === userId;
  } else {
    const [row] = await db.select({ userId: ordersTable.userId }).from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    owned = !!row && row.userId === userId;
  }
  if (!owned) {
    res.status(403).json({ error: "Forbidden." });
    return;
  }

  /* Now safe to query review status — already scoped to (orderId + userId) */
  const rows = await db
    .select()
    .from(reviewsTable)
    .where(and(eq(reviewsTable.orderId, orderId), eq(reviewsTable.userId, userId)))
    .limit(1);

  res.json({ reviewed: rows.length > 0, review: rows[0] ?? null });
});

/* ── GET /reviews/my — list all reviews submitted by the logged-in customer ── */
router.get("/my", customerAuth, async (req, res) => {
  const userId     = req.customerId!;
  const pageParam  = Math.max(1, parseInt(String(req.query["page"] || "1")));
  const limitParam = Math.min(parseInt(String(req.query["limit"] || "50")), 100);
  const offset     = (pageParam - 1) * limitParam;

  /* Fetch both review sources without local slicing so we can compute an accurate total */

  /* All reviews from the unified reviews table (order reviews + ride reviews posted via Orders tab) */
  const [reviewRows, rideRatingsRows] = await Promise.all([
    db
      .select({
        id: reviewsTable.id,
        type: sql<string>`CASE WHEN ${reviewsTable.orderType} = 'ride' THEN 'ride' ELSE 'order' END`,
        orderId: reviewsTable.orderId,
        vendorId: reviewsTable.vendorId,
        riderId: reviewsTable.riderId,
        orderType: reviewsTable.orderType,
        rating: reviewsTable.rating,
        riderRating: reviewsTable.riderRating,
        comment: reviewsTable.comment,
        createdAt: reviewsTable.createdAt,
        vendorName: usersTable.storeName,
      })
      .from(reviewsTable)
      .leftJoin(usersTable, eq(reviewsTable.vendorId, usersTable.id))
      .where(and(eq(reviewsTable.userId, userId), isNull(reviewsTable.deletedAt)))
      .orderBy(desc(reviewsTable.createdAt)),

    /* Ride ratings submitted via the dedicated /rides/:id/rate endpoint */
    db
      .select({
        id: rideRatingsTable.id,
        type: sql<string>`'ride'`,
        orderId: rideRatingsTable.rideId,
        vendorId: sql<string | null>`null`,
        riderId: rideRatingsTable.riderId,
        orderType: sql<string>`'ride'`,
        rating: rideRatingsTable.stars,
        riderRating: sql<number | null>`null`,
        comment: rideRatingsTable.comment,
        createdAt: rideRatingsTable.createdAt,
        vendorName: sql<string | null>`null`,
      })
      .from(rideRatingsTable)
      .where(and(eq(rideRatingsTable.customerId, userId), isNull(rideRatingsTable.deletedAt)))
      .orderBy(desc(rideRatingsTable.createdAt)),
  ]);

  /* Merge and sort chronologically — dedup so a ride reviewed via /reviews
     doesn't also appear as a legacy rideRatingsTable row */
  const rideIdsInReviews = new Set(
    reviewRows.filter(r => r.orderType === "ride").map(r => r.orderId),
  );
  const filteredRideRatings = rideRatingsRows.filter(r => !rideIdsInReviews.has(r.orderId));

  const allRows = [...reviewRows, ...filteredRideRatings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = allRows.length; // true total before pagination

  /* Paginate after sorting */
  const paginated = allRows.slice(offset, offset + limitParam);

  /* Enrich with rider names */
  const riderIds = [...new Set(paginated.map(r => r.riderId).filter(Boolean))] as string[];
  const riderUsers = riderIds.length > 0
    ? await db.select({ id: usersTable.id, name: usersTable.name })
        .from(usersTable)
        .where(sql`${usersTable.id} = ANY(${riderIds})`)
    : [];
  const riderMap = new Map(riderUsers.map(u => [u.id, u.name]));

  const reviews = paginated.map(r => ({
    ...r,
    riderName: r.riderId ? (riderMap.get(r.riderId) ?? null) : null,
  }));

  res.json({ reviews, total, page: pageParam, pages: Math.ceil(total / limitParam) });
});

/* ── GET /reviews/vendor/:vendorId — all visible reviews for a vendor (public) ── */
router.get("/vendor/:vendorId", async (req, res) => {
  const rows = await db
    .select({
      id: reviewsTable.id,
      orderId: reviewsTable.orderId,
      userId: reviewsTable.userId,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      orderType: reviewsTable.orderType,
      createdAt: reviewsTable.createdAt,
      customerName: usersTable.name,
    })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
    .where(and(
      eq(reviewsTable.vendorId, req.params["vendorId"]!),
      eq(reviewsTable.hidden, false),
      isNull(reviewsTable.deletedAt),
    ))
    .orderBy(desc(reviewsTable.createdAt));

  const avg = rows.length
    ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1)
    : null;

  res.json({ reviews: rows, avgRating: avg ? parseFloat(avg) : null, total: rows.length });
});

export default router;
