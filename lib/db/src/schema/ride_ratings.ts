import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rideRatingsTable = pgTable("ride_ratings", {
  id: text("id").primaryKey(),
  rideId: text("ride_id").notNull(),
  customerId: text("customer_id").notNull(),
  riderId: text("rider_id").notNull(),
  stars: integer("stars").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("ride_ratings_ride_id_uidx").on(t.rideId),
  index("ride_ratings_rider_id_idx").on(t.riderId),
  index("ride_ratings_customer_id_idx").on(t.customerId),
]);

export const insertRideRatingSchema = createInsertSchema(rideRatingsTable).omit({ createdAt: true });
export type InsertRideRating = z.infer<typeof insertRideRatingSchema>;
export type RideRating = typeof rideRatingsTable.$inferSelect;
