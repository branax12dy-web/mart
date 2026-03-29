import { decimal, index, uniqueIndex, integer, pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ridesTable = pgTable("rides", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("searching"),
  pickupAddress: text("pickup_address").notNull(),
  dropAddress: text("drop_address").notNull(),
  pickupLat: decimal("pickup_lat", { precision: 10, scale: 6 }),
  pickupLng: decimal("pickup_lng", { precision: 10, scale: 6 }),
  dropLat: decimal("drop_lat", { precision: 10, scale: 6 }),
  dropLng: decimal("drop_lng", { precision: 10, scale: 6 }),
  fare: decimal("fare", { precision: 10, scale: 2 }).notNull(),
  distance: decimal("distance", { precision: 10, scale: 2 }).notNull(),
  riderId: text("rider_id"),
  riderName: text("rider_name"),
  riderPhone: text("rider_phone"),
  paymentMethod: text("payment_method").notNull(),
  /* ── Bargaining fields ── */
  offeredFare:    decimal("offered_fare",   { precision: 10, scale: 2 }),
  counterFare:    decimal("counter_fare",   { precision: 10, scale: 2 }),
  bargainStatus:  text("bargain_status"),
  bargainRounds:  integer("bargain_rounds").default(0),
  bargainNote:    text("bargain_note"),
  /* ── Dispatch engine fields ── */
  dispatchedRiderId: text("dispatched_rider_id"),
  dispatchAttempts:  jsonb("dispatch_attempts").default([]),
  dispatchLoopCount: integer("dispatch_loop_count").default(0),
  dispatchedAt:      timestamp("dispatched_at"),
  expiresAt:         timestamp("expires_at"),
  /* ── Timestamps ── */
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("rides_user_id_idx").on(t.userId),
  index("rides_rider_id_idx").on(t.riderId),
  index("rides_status_idx").on(t.status),
  index("rides_created_at_idx").on(t.createdAt),
]);

export const insertRideSchema = createInsertSchema(ridesTable).omit({ createdAt: true, updatedAt: true });
export type InsertRide = z.infer<typeof insertRideSchema>;
export type Ride = typeof ridesTable.$inferSelect;

export const rideRatingsTable = pgTable("ride_ratings", {
  id: text("id").primaryKey(),
  rideId: text("ride_id").notNull(),
  customerId: text("customer_id").notNull(),
  riderId: text("rider_id").notNull(),
  stars: integer("stars").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("ride_ratings_ride_id_uniq").on(t.rideId),
  index("ride_ratings_rider_id_idx").on(t.riderId),
  index("ride_ratings_customer_id_idx").on(t.customerId),
  check("ride_ratings_stars_range", sql`${t.stars} BETWEEN 1 AND 5`),
]);

export const insertRideRatingSchema = createInsertSchema(rideRatingsTable).omit({ createdAt: true });
export type InsertRideRating = z.infer<typeof insertRideRatingSchema>;
export type RideRating = typeof rideRatingsTable.$inferSelect;

export const riderPenaltiesTable = pgTable("rider_penalties", {
  id: text("id").primaryKey(),
  riderId: text("rider_id").notNull(),
  type: text("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("rider_penalties_rider_id_idx").on(t.riderId),
  index("rider_penalties_type_idx").on(t.type),
  index("rider_penalties_created_at_idx").on(t.createdAt),
]);
