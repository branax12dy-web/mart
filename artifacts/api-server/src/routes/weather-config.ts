import { Router } from "express";
import { db } from "@workspace/db";
import { weatherConfigTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { sendSuccess } from "../lib/response.js";

const router = Router();

router.get("/", async (_req, res) => {
  const [config] = await db.select().from(weatherConfigTable).where(eq(weatherConfigTable.id, "default")).limit(1);
  if (!config) {
    sendSuccess(res, { config: { widgetEnabled: true, cities: "Muzaffarabad,Rawalakot,Mirpur,Bagh,Kotli,Neelum" } });
    return;
  }
  sendSuccess(res, { config: { widgetEnabled: config.widgetEnabled, cities: config.cities } });
});

export default router;
