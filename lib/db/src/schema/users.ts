import { boolean, decimal, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id:              text("id").primaryKey(),
  phone:           text("phone").notNull().unique(),
  name:            text("name"),
  email:           text("email"),
  role:            text("role").notNull().default("customer"),
  roles:           text("roles").notNull().default("customer"),
  avatar:          text("avatar"),
  walletBalance:   decimal("wallet_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  otpCode:         text("otp_code"),
  otpExpiry:       timestamp("otp_expiry"),
  isActive:        boolean("is_active").notNull().default(true),
  isBanned:        boolean("is_banned").notNull().default(false),
  banReason:       text("ban_reason"),
  blockedServices: text("blocked_services").notNull().default(""),
  securityNote:    text("security_note"),
  isOnline:        boolean("is_online").notNull().default(false),
  storeName:       text("store_name"),
  storeCategory:   text("store_category"),
  lastLoginAt:     timestamp("last_login_at"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
