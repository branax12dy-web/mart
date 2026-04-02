import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userInteractionsTable = pgTable("user_interactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  productId: text("product_id").notNull(),
  interactionType: text("interaction_type").notNull().default("view"),
  weight: integer("weight").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("user_interactions_user_id_idx").on(t.userId),
  index("user_interactions_product_id_idx").on(t.productId),
  index("user_interactions_type_idx").on(t.interactionType),
  index("user_interactions_created_at_idx").on(t.createdAt),
]);

export const insertUserInteractionSchema = createInsertSchema(userInteractionsTable).omit({ createdAt: true });
export type InsertUserInteraction = z.infer<typeof insertUserInteractionSchema>;
export type UserInteraction = typeof userInteractionsTable.$inferSelect;
