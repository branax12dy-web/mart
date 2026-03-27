import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviewsTable = pgTable("reviews", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  userId: text("user_id").notNull(),
  vendorId: text("vendor_id"),
  riderId: text("rider_id"),
  orderType: text("order_type").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  /* One review per user per order */
  uniqueIndex("reviews_order_user_uidx").on(t.orderId, t.userId),
  index("reviews_user_id_idx").on(t.userId),
  index("reviews_vendor_id_idx").on(t.vendorId),
  index("reviews_rider_id_idx").on(t.riderId),
  /* DB-enforced rating range — no garbage data */
  check("reviews_rating_range", sql`${t.rating} BETWEEN 1 AND 5`),
]);

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
