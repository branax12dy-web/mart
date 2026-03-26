import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { liveLocationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  getCachedSettings,
  detectGPSSpoof,
  addSecurityEvent,
  getClientIp,
} from "../middleware/security.js";

const router: IRouter = Router();

router.post("/update", async (req, res) => {
  const { userId, latitude, longitude, role, accuracy } = req.body;
  if (!userId || !latitude || !longitude) {
    res.status(400).json({ error: "userId, latitude and longitude are required" });
    return;
  }

  const ip = getClientIp(req);
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    res.status(400).json({ error: "Invalid latitude or longitude values" });
    return;
  }

  const settings = await getCachedSettings();

  /* ── GPS Accuracy check ── */
  if (accuracy !== undefined && settings["security_gps_tracking"] === "on") {
    const minAccuracyMeters = parseInt(settings["security_gps_accuracy"] ?? "50", 10);
    if (parseFloat(accuracy) > minAccuracyMeters) {
      /* We still allow it but flag it */
      req.log?.warn?.({ userId, accuracy }, "GPS accuracy below threshold");
    }
  }

  /* ── GPS Spoof Detection ── */
  if (settings["security_spoof_detection"] === "on" && role === "rider") {
    const maxSpeedKmh = parseInt(settings["security_max_speed_kmh"] ?? "150", 10);

    /* Fetch previous location */
    const [prev] = await db
      .select()
      .from(liveLocationsTable)
      .where(eq(liveLocationsTable.userId, userId))
      .limit(1);

    if (prev) {
      const prevLat = parseFloat(String(prev.latitude));
      const prevLon = parseFloat(String(prev.longitude));
      const prevTime = prev.updatedAt;

      const { spoofed, speedKmh } = detectGPSSpoof(prevLat, prevLon, prevTime, lat, lon, maxSpeedKmh);

      if (spoofed) {
        addSecurityEvent({
          type: "gps_spoof_detected",
          ip,
          userId,
          details: `GPS spoof detected: speed ${speedKmh.toFixed(1)} km/h exceeds limit of ${maxSpeedKmh} km/h`,
          severity: "high",
        });

        /* Reject the spoofed location update */
        res.status(400).json({
          error: "GPS location rejected: movement speed is physically impossible. Please disable mock location apps.",
          detectedSpeedKmh: Math.round(speedKmh),
          maxAllowedKmh: maxSpeedKmh,
        });
        return;
      }
    }
  }

  /* ── GPS Tracking feature check ── */
  if (settings["security_gps_tracking"] === "off" && role === "rider") {
    res.status(403).json({ error: "GPS tracking is currently disabled by admin." });
    return;
  }

  /* ── Geofence mode — future extensibility ── */
  if (settings["security_geo_fence"] === "on") {
    /* Strict geofence would check if lat/lon is within allowed boundary.
       Implementation depends on configured geofence polygon. */
  }

  await db.insert(liveLocationsTable).values({
    userId,
    latitude: lat.toString(),
    longitude: lon.toString(),
    role: role || "customer",
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: liveLocationsTable.userId,
    set: {
      latitude: lat.toString(),
      longitude: lon.toString(),
      updatedAt: new Date(),
    },
  });

  res.json({ success: true, updatedAt: new Date().toISOString() });
});

/* ── GET /locations/:userId — fetch current location ── */
router.get("/:userId", async (req, res) => {
  const [loc] = await db
    .select()
    .from(liveLocationsTable)
    .where(eq(liveLocationsTable.userId, req.params["userId"]!))
    .limit(1);
  if (!loc) { res.status(404).json({ error: "Location not found" }); return; }
  res.json({
    userId: loc.userId,
    latitude: parseFloat(String(loc.latitude)),
    longitude: parseFloat(String(loc.longitude)),
    role: loc.role,
    updatedAt: loc.updatedAt.toISOString(),
  });
});

export default router;
