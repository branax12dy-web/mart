import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationsTable = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: text("type").notNull().default("system"),
  isRead: boolean("is_read").notNull().default(false),
  icon: text("icon").default("notifications-outline"),
  link: text("link"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("notifications_user_id_idx").on(t.userId),
  /* Composite index for the common query pattern: user's unread notifications */
  index("notifications_user_read_idx").on(t.userId, t.isRead),
  index("notifications_created_at_idx").on(t.createdAt),
]);

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
