import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reviewsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "../lib/id.js";

const router: IRouter = Router();

/* ── POST /reviews — submit a review ─────────────────────────────────────── */
router.post("/", async (req, res) => {
  const { orderId, userId, vendorId, riderId, orderType, rating, comment } = req.body;

  if (!orderId || !userId || !orderType || !rating) {
    res.status(400).json({ error: "orderId, userId, orderType, and rating are required" });
    return;
  }
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    res.status(400).json({ error: "rating must be 1–5" });
    return;
  }

  const existing = await db
    .select()
    .from(reviewsTable)
    .where(and(eq(reviewsTable.orderId, orderId), eq(reviewsTable.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Already reviewed" });
    return;
  }

  const [review] = await db.insert(reviewsTable).values({
    id: generateId(),
    orderId,
    userId,
    vendorId: vendorId ?? null,
    riderId: riderId ?? null,
    orderType,
    rating,
    comment: comment ?? null,
  }).returning();

  res.status(201).json(review);
});

/* ── GET /reviews?orderId= — check if reviewed ────────────────────────────── */
router.get("/", async (req, res) => {
  const orderId = req.query["orderId"] as string;
  const userId  = req.query["userId"]  as string;
  if (!orderId || !userId) { res.status(400).json({ error: "orderId and userId required" }); return; }

  const rows = await db
    .select()
    .from(reviewsTable)
    .where(and(eq(reviewsTable.orderId, orderId), eq(reviewsTable.userId, userId)))
    .limit(1);

  res.json({ reviewed: rows.length > 0, review: rows[0] ?? null });
});

/* ── GET /reviews/vendor/:vendorId — all reviews for a vendor ─────────────── */
router.get("/vendor/:vendorId", async (req, res) => {
  const rows = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.vendorId, req.params["vendorId"]!))
    .orderBy(reviewsTable.createdAt);

  const avg = rows.length
    ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1)
    : null;

  res.json({ reviews: rows.reverse(), avgRating: avg ? parseFloat(avg) : null, total: rows.length });
});

export default router;
