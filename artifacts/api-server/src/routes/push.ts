import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { pushSubscriptionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "../lib/id.js";
import { customerAuth } from "../middleware/security.js";
import { getVapidPublicKey } from "../lib/webpush.js";
import { z } from "zod/v4";

const router: IRouter = Router();

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh:   z.string().min(1),
  auth:     z.string().min(1),
  role:     z.enum(["customer", "rider", "vendor", "admin"]).default("customer"),
});

router.get("/vapid-key", (_req, res) => {
  const key = getVapidPublicKey();
  if (!key) { res.status(503).json({ error: "Push notifications not configured" }); return; }
  res.json({ publicKey: key });
});

router.post("/subscribe", customerAuth, async (req, res) => {
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message }); return; }
  const userId = req.customerId!;
  const { endpoint, p256dh, auth, role } = parsed.data;

  await db.delete(pushSubscriptionsTable)
    .where(and(eq(pushSubscriptionsTable.userId, userId), eq(pushSubscriptionsTable.endpoint, endpoint)));

  const id = generateId();
  await db.insert(pushSubscriptionsTable).values({ id, userId, role, endpoint, p256dh, authKey: auth });
  res.json({ success: true, id });
});

router.delete("/unsubscribe", customerAuth, async (req, res) => {
  const userId = req.customerId!;
  const { endpoint } = req.body as { endpoint?: string };
  if (endpoint) {
    await db.delete(pushSubscriptionsTable)
      .where(and(eq(pushSubscriptionsTable.userId, userId), eq(pushSubscriptionsTable.endpoint, endpoint)));
  } else {
    await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, userId));
  }
  res.json({ success: true });
});

export default router;
