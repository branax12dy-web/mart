import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq, ilike, and, SQL } from "drizzle-orm";
import { generateId } from "../lib/id.js";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "ajkmart-admin-2025";

function requireAdmin(req: Request, res: Response): boolean {
  const secret = String(req.headers["x-admin-secret"] || "");
  if (secret !== ADMIN_SECRET) {
    res.status(401).json({ error: "Admin authentication required." });
    return false;
  }
  return true;
}

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const { category, search, type } = req.query;
  const conditions: SQL[] = [];
  if (type) conditions.push(eq(productsTable.type, type as string));
  if (category) conditions.push(eq(productsTable.category, category as string));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  const products = conditions.length > 0
    ? await db.select().from(productsTable).where(and(...conditions))
    : await db.select().from(productsTable);
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
  res.json({
    ...product,
    price: parseFloat(product.price),
    originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : undefined,
    rating: product.rating ? parseFloat(product.rating) : 4.0,
  });
});

router.post("/", async (req, res) => {
  if (!requireAdmin(req, res)) return;
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
