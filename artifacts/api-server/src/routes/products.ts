import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productsTable, productVariantsTable } from "@workspace/db/schema";
import { eq, ilike, and, SQL, gte, lte, desc, asc, sql } from "drizzle-orm";
import { generateId } from "../lib/id.js";
import { adminAuth, getPlatformSettings } from "./admin.js";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const { category, search, type, minPrice, maxPrice, minRating, sort, vendor } = req.query;

  if (type && typeof type === "string") {
    try {
      const s = await getPlatformSettings();
      const featureKey = `feature_${type}`;
      const enabled = (s[featureKey] ?? "on") === "on";
      if (!enabled) {
        res.status(503).json({ error: `${type.charAt(0).toUpperCase() + type.slice(1)} service is currently disabled`, products: [], total: 0 });
        return;
      }
    } catch {}
  }

  const conditions: SQL[] = [
    eq(productsTable.approvalStatus, "approved"),
    eq(productsTable.inStock, true),
  ];
  if (type) conditions.push(eq(productsTable.type, type as string));
  if (category) conditions.push(eq(productsTable.category, category as string));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (vendor) conditions.push(eq(productsTable.vendorId, vendor as string));
  if (minPrice) conditions.push(gte(productsTable.price, String(minPrice)));
  if (maxPrice) conditions.push(lte(productsTable.price, String(maxPrice)));
  if (minRating) conditions.push(gte(productsTable.rating, String(minRating)));

  let orderBy;
  switch (sort) {
    case "price_asc": orderBy = asc(productsTable.price); break;
    case "price_desc": orderBy = desc(productsTable.price); break;
    case "rating": orderBy = desc(productsTable.rating); break;
    case "newest": orderBy = desc(productsTable.createdAt); break;
    case "popular": orderBy = desc(productsTable.reviewCount); break;
    default: orderBy = desc(productsTable.createdAt);
  }

  const products = await db.select().from(productsTable).where(and(...conditions)).orderBy(orderBy);
  res.json({
    products: products.map(p => ({
      ...p,
      price: parseFloat(p.price),
      originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : undefined,
      rating: p.rating ? parseFloat(p.rating) : 4.0,
    })),
    total: products.length,
  });
});

router.get("/:id", async (req, res) => {
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, req.params["id"]!)).limit(1);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  if (product.type) {
    try {
      const s = await getPlatformSettings();
      const featureKey = `feature_${product.type}`;
      if ((s[featureKey] ?? "on") !== "on") {
        res.status(503).json({ error: `${product.type.charAt(0).toUpperCase() + product.type.slice(1)} service is currently disabled` });
        return;
      }
    } catch {}
  }

  const variants = await db
    .select()
    .from(productVariantsTable)
    .where(and(
      eq(productVariantsTable.productId, product.id),
      eq(productVariantsTable.inStock, true),
    ))
    .orderBy(asc(productVariantsTable.sortOrder));

  res.json({
    ...product,
    price: parseFloat(product.price),
    originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : undefined,
    rating: product.rating ? parseFloat(product.rating) : 4.0,
    variants: variants.map(v => ({
      ...v,
      price: parseFloat(v.price),
      originalPrice: v.originalPrice ? parseFloat(v.originalPrice) : undefined,
      attributes: v.attributes ? JSON.parse(v.attributes) : null,
    })),
  });
});

router.post("/", adminAuth, async (req, res) => {
  const { name, description, price, category, type, image, vendorId, unit } = req.body;
  const [product] = await db.insert(productsTable).values({
    id: generateId(),
    name,
    description,
    price: price.toString(),
    category,
    type: type || "mart",
    image,
    vendorId,
    unit,
    inStock: true,
  }).returning();
  res.status(201).json({
    ...product!,
    price: parseFloat(product!.price),
  });
});

export default router;
