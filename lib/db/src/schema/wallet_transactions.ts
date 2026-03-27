import { decimal, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const walletTransactionsTable = pgTable("wallet_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  reference: text("reference"),
  paymentMethod: text("payment_method"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("wallet_txn_user_id_idx").on(t.userId),
  index("wallet_txn_created_at_idx").on(t.createdAt),
]);

export const insertWalletTransactionSchema = createInsertSchema(walletTransactionsTable).omit({ createdAt: true });
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactionsTable.$inferSelect;
