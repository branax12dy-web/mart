import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, productsTable, reviewsTable } from "@workspace/db/schema";
import { eq, and, sql, isNotNull } from "drizzle-orm";
import { sendSuccess, sendNotFound } from "../lib/response.js";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const { category } = req.query as Record<string, string | undefined>;

  const conditions = [eq(usersTable.role, "vendor")];
  if (category) {
    conditions.push(eq(usersTable.storeCategory, category));
  }

  const vendors = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      storeName: usersTable.storeName,
      storeCategory: usersTable.storeCategory,
      storeBanner: usersTable.storeBanner,
      storeDeliveryTime: usersTable.storeDeliveryTime,
      storeIsOpen: usersTable.storeIsOpen,
      storeMinOrder: usersTable.storeMinOrder,
      avatar: usersTable.avatar,
      city: usersTable.city,
    })
    .from(usersTable)
    .where(and(...conditions));

  const vendorIds = vendors.map(v => v.id);
  const productCounts: Record<string, number> = {};
  const avgRatings: Record<string, number> = {};
  if (vendorIds.length > 0) {
    const counts = await db
      .select({ vendorId: productsTable.vendorId, count: sql<number>`count(*)` })
      .from(productsTable)
      .where(and(eq(productsTable.approvalStatus, "approved"), eq(productsTable.inStock, true)))
      .groupBy(productsTable.vendorId);
    for (const row of counts) {
      if (row.vendorId) productCounts[row.vendorId] = Number(row.count);
    }

    const ratings = await db
      .select({
        vendorId: reviewsTable.vendorId,
        avgRating: sql<number>`round(avg(${reviewsTable.rating})::numeric, 1)`,
      })
      .from(reviewsTable)
      .where(and(isNotNull(reviewsTable.vendorId), eq(reviewsTable.status, "visible")))
      .groupBy(reviewsTable.vendorId);
    for (const row of ratings) {
      if (row.vendorId) avgRatings[row.vendorId] = Number(row.avgRating);
    }
  }

  sendSuccess(res, {
    vendors: vendors.map(v => ({
      id: v.id,
      name: v.storeName || v.name,
      storeName: v.storeName,
      storeCategory: v.storeCategory,
      storeBanner: v.storeBanner,
      storeDeliveryTime: v.storeDeliveryTime,
      storeIsOpen: v.storeIsOpen ?? true,
      storeMinOrder: v.storeMinOrder ? parseFloat(String(v.storeMinOrder)) : 0,
      avatar: v.avatar,
      city: v.city,
      productCount: productCounts[v.id] ?? 0,
      avgRating: avgRatings[v.id] ?? null,
    })),
  });
});

router.get("/:id/store", async (req, res) => {
  const { id } = req.params;

  const vendor = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      storeName: usersTable.storeName,
      storeCategory: usersTable.storeCategory,
      storeBanner: usersTable.storeBanner,
      storeDescription: usersTable.storeDescription,
      storeDeliveryTime: usersTable.storeDeliveryTime,
      storeIsOpen: usersTable.storeIsOpen,
      storeMinOrder: usersTable.storeMinOrder,
      storeAnnouncement: usersTable.storeAnnouncement,
      storeHours: usersTable.storeHours,
      avatar: usersTable.avatar,
      city: usersTable.city,
    })
    .from(usersTable)
    .where(and(eq(usersTable.id, id), eq(usersTable.role, "vendor")))
    .limit(1);

  if (!vendor.length) {
    sendNotFound(res, "Vendor not found");
    return;
  }

  const products = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.vendorId, id), eq(productsTable.approvalStatus, "approved"), eq(productsTable.inStock, true)));

  const v = vendor[0]!;
  sendSuccess(res, {
    vendor: {
      id: v.id,
      name: v.storeName || v.name,
      storeName: v.storeName,
      storeCategory: v.storeCategory,
      storeBanner: v.storeBanner,
      storeDescription: v.storeDescription,
      storeDeliveryTime: v.storeDeliveryTime,
      storeIsOpen: v.storeIsOpen ?? true,
      storeMinOrder: v.storeMinOrder ? parseFloat(String(v.storeMinOrder)) : 0,
      storeAnnouncement: v.storeAnnouncement,
      avatar: v.avatar,
      city: v.city,
    },
    products: products.map(p => ({
      ...p,
      price: parseFloat(p.price),
      originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : undefined,
      rating: p.rating ? parseFloat(p.rating) : null,
    })),
  });
});

export default router;
