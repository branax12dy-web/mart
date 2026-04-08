import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, platformSettingsTable, authAuditLogTable } from "@workspace/db/schema";
import { eq, desc, and, sql, inArray, type SQL } from "drizzle-orm";
import {
  addAuditEntry, getClientIp, getPlatformSettings, invalidateSettingsCache,
  type AdminRequest,
} from "../admin-shared.js";
import { sendSuccess, sendNotFound, sendValidationError } from "../../lib/response.js";
import { generateSecureOtp } from "../../services/password.js";
import { createHash } from "crypto";
import { writeAuthAuditLog } from "../../middleware/security.js";

const router = Router();

function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

async function upsertSetting(key: string, value: string) {
  await db
    .insert(platformSettingsTable)
    .values({ key, value, label: key, category: "otp" })
    .onConflictDoUpdate({
      target: platformSettingsTable.key,
      set: { value, updatedAt: new Date() },
    });
  invalidateSettingsCache();
}

/* ─── GET /admin/otp/status ───────────────────────────────────────────────── */
router.get("/otp/status", async (_req, res) => {
  const settings = await getPlatformSettings();

  const disabledUntilStr = settings["otp_global_disabled_until"];
  const disabledUntil = disabledUntilStr ? new Date(disabledUntilStr) : null;
  const isGloballyDisabled = !!(disabledUntil && disabledUntil > new Date());

  const [{ bypassCount }] = await db
    .select({ bypassCount: sql<number>`COUNT(*)::int` })
    .from(usersTable)
    .where(sql`otp_bypass_until > now()`);

  sendSuccess(res, {
    isGloballyDisabled,
    disabledUntil: isGloballyDisabled ? disabledUntil!.toISOString() : null,
    activeBypassCount: Number(bypassCount ?? 0),
  });
});

/* ─── POST /admin/otp/disable ─────────────────────────────────────────────── */
router.post("/otp/disable", async (req, res) => {
  const minutes = Number(req.body?.minutes);
  if (!minutes || minutes <= 0 || minutes > 1440) {
    sendValidationError(res, "minutes must be between 1 and 1440");
    return;
  }

  const disabledUntil = new Date(Date.now() + minutes * 60 * 1000);
  await upsertSetting("otp_global_disabled_until", disabledUntil.toISOString());

  const ip = getClientIp(req);
  const adminReq = req as AdminRequest;
  addAuditEntry({
    action: "admin_otp_global_disable",
    ip,
    adminId: adminReq.adminId,
    details: `Admin globally disabled OTPs for ${minutes} minutes until ${disabledUntil.toISOString()}`,
    result: "success",
  });
  writeAuthAuditLog("admin_otp_global_disable", {
    ip,
    userAgent: req.headers["user-agent"] ?? undefined,
    metadata: { adminId: adminReq.adminId, minutes, disabledUntil: disabledUntil.toISOString(), result: "success" },
  });

  sendSuccess(res, { disabledUntil: disabledUntil.toISOString(), minutes });
});

/* ─── DELETE /admin/otp/disable ───────────────────────────────────────────── */
router.delete("/otp/disable", async (req, res) => {
  await upsertSetting("otp_global_disabled_until", "");

  const ip = getClientIp(req);
  const adminReq = req as AdminRequest;
  addAuditEntry({
    action: "admin_otp_global_restore",
    ip,
    adminId: adminReq.adminId,
    details: "Admin manually restored global OTP (early restore)",
    result: "success",
  });
  writeAuthAuditLog("admin_otp_global_restore", {
    ip,
    userAgent: req.headers["user-agent"] ?? undefined,
    metadata: { adminId: adminReq.adminId, result: "success" },
  });

  sendSuccess(res, { success: true });
});

/* ─── GET /admin/otp/audit ────────────────────────────────────────────────── */
router.get("/otp/audit", async (req, res) => {
  const { userId, from, to, page } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page ?? "1", 10));
  const limit = 50;
  const offset = (pageNum - 1) * limit;

  const otpEvents = [
    "otp_sent", "otp_verified", "otp_failed", "otp_verified_new_user",
    "login_otp_bypass", "login_global_otp_bypass", "otp_reuse_attempt",
    "otp_expired", "otp_send_bypassed", "otp_send_global_bypassed",
    "admin_otp_bypass_set", "admin_otp_bypass_cancel", "admin_otp_generate",
    "admin_otp_global_disable", "admin_otp_global_restore",
  ];

  /* Validate date params before executing query */
  if (from && isNaN(new Date(from).getTime())) {
    res.status(400).json({ error: "Invalid 'from' date parameter" });
    return;
  }
  if (to && isNaN(new Date(to).getTime())) {
    res.status(400).json({ error: "Invalid 'to' date parameter" });
    return;
  }

  try {
    const eventFilter: SQL = sql`${authAuditLogTable.event} IN (${sql.join(otpEvents.map(e => sql`${e}`), sql`, `)})`;
    const conditions: SQL[] = [eventFilter];

    if (userId) conditions.push(sql`${authAuditLogTable.userId} = ${userId}`);
    if (from) conditions.push(sql`${authAuditLogTable.createdAt} >= ${new Date(from)}`);
    if (to) conditions.push(sql`${authAuditLogTable.createdAt} <= ${new Date(to)}`);

    const whereClause = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(authAuditLogTable).where(whereClause)
        .orderBy(desc(authAuditLogTable.createdAt)).limit(limit).offset(offset),
      db.select({ total: sql<number>`COUNT(*)::int` }).from(authAuditLogTable).where(whereClause),
    ]);

    /* Batch-fetch user info for all rows with a userId (avoids N+1 queries) */
    const userIds = [...new Set(rows.map(r => r.userId).filter((id): id is string => !!id))];
    const userMap = new Map<string, { phone: string | null; name: string | null }>();
    if (userIds.length > 0) {
      const users = await db.select({ id: usersTable.id, phone: usersTable.phone, name: usersTable.name })
        .from(usersTable).where(inArray(usersTable.id, userIds));
      for (const u of users) userMap.set(u.id, { phone: u.phone, name: u.name });
    }

    const FAIL_EVENTS = new Set(["otp_failed", "otp_reuse_attempt", "otp_expired", "otp_rate_limit_exceeded"]);

    const enriched = rows.map((row) => {
      const userInfo = row.userId ? (userMap.get(row.userId) ?? {}) : {};
      let metadata: Record<string, unknown> = {};
      try { metadata = row.metadata ? JSON.parse(row.metadata) : {}; } catch {}
      /* Infer result from event type when metadata.result is absent */
      const metaResult = metadata?.result as string | null | undefined;
      const derivedResult = metaResult ?? (FAIL_EVENTS.has(row.event) ? "fail" : "success");

      return {
        id: row.id,
        event: row.event,
        userId: row.userId,
        phone: (userInfo as { phone?: string | null }).phone ?? (metadata?.phone as string | null) ?? null,
        name: (userInfo as { name?: string | null }).name ?? null,
        ip: row.ip,
        channel: (metadata?.channel as string | null) ?? null,
        result: derivedResult,
        adminId: (metadata?.adminId as string | null) ?? null,
        createdAt: row.createdAt,
      };
    });

    sendSuccess(res, {
      entries: enriched,
      total: Number(total ?? 0),
      page: pageNum,
      pages: Math.ceil(Number(total ?? 0) / limit),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch OTP audit log", details: msg });
  }
});

/* ─── GET /admin/otp/channels ─────────────────────────────────────────────── */
router.get("/otp/channels", async (_req, res) => {
  const settings = await getPlatformSettings();
  const raw = settings["otp_channel_priority"] ?? "whatsapp,sms,email";
  const channels = raw.split(",").map(s => s.trim()).filter(Boolean);
  const allChannels = ["whatsapp", "sms", "email"];
  const ordered = [...channels, ...allChannels.filter(c => !channels.includes(c))];
  sendSuccess(res, { channels: ordered });
});

/* ─── PATCH /admin/otp/channels ───────────────────────────────────────────── */
router.patch("/otp/channels", async (req, res) => {
  const { channels } = req.body;
  if (!Array.isArray(channels) || channels.length === 0) {
    sendValidationError(res, "channels must be a non-empty array");
    return;
  }
  const valid = ["whatsapp", "sms", "email"];
  /* Deduplicate while preserving order, then append any missing valid channels at the end */
  const seen = new Set<string>();
  const deduped = (channels as string[]).filter(c => valid.includes(c) && !seen.has(c) && seen.add(c));
  const canonical = [...deduped, ...valid.filter(c => !seen.has(c))];
  if (deduped.length === 0) {
    sendValidationError(res, "No valid channels provided (whatsapp, sms, email)");
    return;
  }

  await upsertSetting("otp_channel_priority", canonical.join(","));

  const ip = getClientIp(req);
  const adminReq = req as AdminRequest;
  addAuditEntry({
    action: "admin_otp_channels_update",
    ip,
    adminId: adminReq.adminId,
    details: `Admin updated OTP channel priority: ${canonical.join(" → ")}`,
    result: "success",
  });

  sendSuccess(res, { channels: canonical });
});

/* ─── POST /admin/users/:id/otp/generate ─────────────────────────────────── */
router.post("/users/:id/otp/generate", async (req, res) => {
  const userId = req.params["id"]!;
  const [user] = await db.select({ id: usersTable.id, phone: usersTable.phone, name: usersTable.name })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { sendNotFound(res, "User not found"); return; }

  const otp = generateSecureOtp();
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

  await db.update(usersTable)
    .set({ otpCode: hashOtp(otp), otpExpiry, otpUsed: false, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  const ip = getClientIp(req);
  const adminReq = req as AdminRequest;
  addAuditEntry({
    action: "admin_otp_generate",
    ip,
    adminId: adminReq.adminId,
    details: `Admin generated OTP for user ${userId} (${user.phone})`,
    result: "success",
  });
  writeAuthAuditLog("admin_otp_generate", {
    userId,
    ip,
    userAgent: req.headers["user-agent"] ?? undefined,
    metadata: { phone: user.phone, adminId: adminReq.adminId },
  });

  sendSuccess(res, { otp, expiresAt: otpExpiry.toISOString() });
});

export default router;
