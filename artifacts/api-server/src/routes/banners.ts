import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bannersTable } from "@workspace/db/schema";
import { eq, and, or, lte, gte, isNull, desc, asc } from "drizzle-orm";
import { generateId } from "../lib/id.js";
import { adminAuth } from "./admin.js";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const placement = (req.query["placement"] as string) || "home";
  const service = req.query["service"] as string | undefined;
  const now = new Date();

  const banners = await db
    .select()
    .from(bannersTable)
    .where(and(
      eq(bannersTable.isActive, true),
      eq(bannersTable.placement, placement),
      or(isNull(bannersTable.startDate), lte(bannersTable.startDate, now)),
      or(isNull(bannersTable.endDate), gte(bannersTable.endDate, now)),
    ))
    .orderBy(asc(bannersTable.sortOrder), desc(bannersTable.createdAt));

  const filtered = service
    ? banners.filter(b => !b.targetService || b.targetService === service || b.targetService === "all")
    : banners;

  res.json({ banners: filtered, total: filtered.length });
});

router.get("/all", adminAuth, async (req, res) => {
  const banners = await db
    .select()
    .from(bannersTable)
    .orderBy(asc(bannersTable.sortOrder), desc(bannersTable.createdAt));
  res.json({ banners, total: banners.length });
});

router.post("/", adminAuth, async (req, res) => {
  const { title, subtitle, imageUrl, linkType, linkValue, targetService, placement, colorFrom, colorTo, icon, sortOrder, isActive, startDate, endDate } = req.body;
  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const [banner] = await db.insert(bannersTable).values({
    id: generateId(),
    title,
    subtitle: subtitle || null,
    imageUrl: imageUrl || null,
    linkType: linkType || "none",
    linkValue: linkValue || null,
    targetService: targetService || null,
    placement: placement || "home",
    colorFrom: colorFrom || "#7C3AED",
    colorTo: colorTo || "#4F46E5",
    icon: icon || null,
    sortOrder: sortOrder ?? 0,
    isActive: isActive !== false,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
  }).returning();
  res.status(201).json(banner);
});

router.patch("/:id", adminAuth, async (req, res) => {
  const bannerId = req.params["id"]!;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const fields = ["title", "subtitle", "imageUrl", "linkType", "linkValue", "targetService", "placement", "colorFrom", "colorTo", "icon", "sortOrder", "isActive"];
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  if (req.body.startDate !== undefined) updates.startDate = req.body.startDate ? new Date(req.body.startDate) : null;
  if (req.body.endDate !== undefined) updates.endDate = req.body.endDate ? new Date(req.body.endDate) : null;

  const [updated] = await db.update(bannersTable).set(updates).where(eq(bannersTable.id, bannerId)).returning();
  if (!updated) {
    res.status(404).json({ error: "Banner not found" });
    return;
  }
  res.json(updated);
});

router.delete("/:id", adminAuth, async (req, res) => {
  const bannerId = req.params["id"]!;
  const [deleted] = await db.delete(bannersTable).where(eq(bannersTable.id, bannerId)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Banner not found" });
    return;
  }
  res.json({ success: true, id: bannerId });
});

export default router;
