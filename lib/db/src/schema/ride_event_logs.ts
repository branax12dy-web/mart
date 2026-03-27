import { decimal, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const rideEventLogsTable = pgTable("ride_event_logs", {
  id:        text("id").primaryKey(),
  rideId:    text("ride_id").notNull(),
  riderId:   text("rider_id").notNull(),
  event:     text("event").notNull(),
  lat:       decimal("lat", { precision: 10, scale: 6 }),
  lng:       decimal("lng", { precision: 10, scale: 6 }),
  notes:     text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("ride_event_logs_ride_id_idx").on(t.rideId),
  index("ride_event_logs_rider_id_idx").on(t.riderId),
]);

export type RideEventLog = typeof rideEventLogsTable.$inferSelect;
