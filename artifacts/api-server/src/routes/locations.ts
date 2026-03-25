import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { liveLocationsTable } from "@workspace/db/schema";

const router: IRouter = Router();

router.post("/update", async (req, res) => {
  const { userId, latitude, longitude, role } = req.body;
  if (!userId || !latitude || !longitude) {
    res.status(400).json({ error: "userId, latitude and longitude are required" });
    return;
  }
  await db.insert(liveLocationsTable).values({
    userId,
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    role,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: liveLocationsTable.userId,
    set: { latitude: latitude.toString(), longitude: longitude.toString(), updatedAt: new Date() },
  });
  res.json({ success: true, updatedAt: new Date().toISOString() });
});

export default router;
