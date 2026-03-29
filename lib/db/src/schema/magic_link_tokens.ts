import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const magicLinkTokensTable = pgTable("magic_link_tokens", {
  id:        text("id").primaryKey(),
  userId:    text("user_id").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt:    timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type MagicLinkToken = typeof magicLinkTokensTable.$inferSelect;
