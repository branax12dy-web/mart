import { Router } from "express";
import { db } from "@workspace/db";
import { weatherConfigTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { addAuditEntry, getClientIp, type AdminRequest } from "../admin-shared.js";
import { sendSuccess, sendValidationError } from "../../lib/response.js";

const router = Router();

async function getOrCreateConfig() {
  const [existing] = await db.select().from(weatherConfigTable).where(eq(weatherConfigTable.id, "default")).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(weatherConfigTable).values({ id: "default" }).returning();
  return created;
}

router.get("/", async (_req, res) => {
  const config = await getOrCreateConfig();
  sendSuccess(res, { config });
});

router.patch("/", async (req, res) => {
  const { widgetEnabled, cities } = req.body;

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof widgetEnabled === "boolean") update.widgetEnabled = widgetEnabled;
  if (typeof cities === "string") update.cities = cities;
  if (Array.isArray(cities)) update.cities = cities.join(",");

  await getOrCreateConfig();
  const [updated] = await db.update(weatherConfigTable).set(update).where(eq(weatherConfigTable.id, "default")).returning();

  addAuditEntry({ action: "weather_config_update", ip: getClientIp(req), adminId: (req as AdminRequest).adminId, details: `Updated weather config: enabled=${updated.widgetEnabled}, cities=${updated.cities}`, result: "success" });
  sendSuccess(res, { config: updated });
});

export default router;
