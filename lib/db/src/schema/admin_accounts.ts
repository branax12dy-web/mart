import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adminAccountsTable = pgTable("admin_accounts", {
  id:          text("id").primaryKey(),
  name:        text("name").notNull(),
  username:    text("username").unique(),
  /** Email address used for password-reset lookups (nullable, unique). */
  email:       text("email"),
  secret:      text("secret").notNull().unique(),
  role:        text("role").notNull().default("manager"),
  permissions: text("permissions").notNull().default(""),
  isActive:    boolean("is_active").notNull().default(true),
  totpSecret:  text("totp_secret"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  language:    text("language").default("en"),
  /** When true, the admin must rotate their password before any other action. */
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  /** Last successful password change (null until first change). */
  passwordChangedAt:  timestamp("password_changed_at"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const insertAdminSchema = createInsertSchema(adminAccountsTable).omit({ createdAt: true });
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type AdminAccount = typeof adminAccountsTable.$inferSelect;
