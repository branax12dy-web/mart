import { decimal, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rideBidsTable = pgTable("ride_bids", {
  id:         text("id").primaryKey(),
  rideId:     text("ride_id").notNull(),
  riderId:    text("rider_id").notNull(),
  riderName:  text("rider_name").notNull(),
  riderPhone: text("rider_phone"),
  fare:       decimal("fare", { precision: 10, scale: 2 }).notNull(),
  note:       text("note"),
  status:     text("status").notNull().default("pending"), /* pending | accepted | rejected */
  createdAt:  timestamp("created_at").notNull().defaultNow(),
  updatedAt:  timestamp("updated_at").notNull().defaultNow(),
});

export const insertRideBidSchema = createInsertSchema(rideBidsTable).omit({ createdAt: true, updatedAt: true });
export type InsertRideBid = z.infer<typeof insertRideBidSchema>;
export type RideBid = typeof rideBidsTable.$inferSelect;
