import { decimal, json, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pharmacyOrdersTable = pgTable("pharmacy_orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  items: json("items").notNull(),
  prescriptionNote: text("prescription_note"),
  deliveryAddress: text("delivery_address").notNull(),
  contactPhone: text("contact_phone").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull().default("pending"),
  estimatedTime: text("estimated_time").default("25-40 min"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPharmacyOrderSchema = createInsertSchema(pharmacyOrdersTable).omit({ createdAt: true, updatedAt: true });
export type InsertPharmacyOrder = z.infer<typeof insertPharmacyOrderSchema>;
export type PharmacyOrder = typeof pharmacyOrdersTable.$inferSelect;
