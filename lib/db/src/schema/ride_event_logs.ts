import { decimal, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const rideEventLogsTable = pgTable("ride_event_logs", {
  id:        text("id").primaryKey(),
  rideId:    text("ride_id").notNull(),
  riderId:   text("rider_id").notNull(),
  event:     text("event").notNull(),
  lat:       decimal("lat", { precision: 10, scale: 6 }),
  lng:       decimal("lng", { precision: 10, scale: 6 }),
  notes:     text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type RideEventLog = typeof rideEventLogsTable.$inferSelect;
