import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const supportMessagesTable = pgTable("support_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  message: text("message").notNull(),
  isFromSupport: boolean("is_from_support").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
