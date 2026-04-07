import { Router } from "express";
import { db } from "@workspace/db";
import { wishlistTable, productsTable } from "@workspace/db/schema";
import { eq, desc, count, sql } from "drizzle-orm";
import { sendSuccess } from "../../lib/response.js";

const router = Router();

router.get("/wishlist-analytics", async (_req, res) => {
  const results = await db
    .select({
      productId: wishlistTable.productId,
      wishlistCount: count(),
      productName: productsTable.name,
      productImage: productsTable.image,
      productCategory: productsTable.category,
      productPrice: productsTable.price,
      productInStock: productsTable.inStock,
      vendorName: productsTable.vendorName,
    })
    .from(wishlistTable)
    .innerJoin(productsTable, eq(wishlistTable.productId, productsTable.id))
    .groupBy(
      wishlistTable.productId,
      productsTable.name,
      productsTable.image,
      productsTable.category,
      productsTable.price,
      productsTable.inStock,
      productsTable.vendorName,
    )
    .orderBy(desc(count()));

  sendSuccess(res, { products: results });
});

export default router;
