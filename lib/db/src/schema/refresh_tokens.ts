import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const refreshTokensTable = pgTable("refresh_tokens", {
  id:         text("id").primaryKey(),
  userId:     text("user_id").notNull(),
  tokenHash:  text("token_hash").notNull().unique(),
  authMethod: text("auth_method"),
  expiresAt:  timestamp("expires_at").notNull(),
  revokedAt:  timestamp("revoked_at"),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

export type RefreshToken = typeof refreshTokensTable.$inferSelect;
