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
import { AuditService } from "../../services/admin-audit.service.js";
import { UserService } from "../../services/admin-user.service.js";

const router = Router();

/* ─── GET /admin/otp/status ───────────────────────────────────────────────── */
router.get("/otp/status", async (_req, res) => {
  try {
    const status = await UserService.getOtpStatus();
    sendSuccess(res, status);
  } catch (error: any) {
    sendValidationError(res, error.message || String(error));
  }
});

/* ─── POST /admin/otp/disable ─────────────────────────────────────────────── */
router.post("/otp/disable", async (req, res) => {
  const minutes = Number(req.body?.minutes);
  const adminReq = req as AdminRequest;

  try {
    const result = await AuditService.executeWithAudit(
      {
        adminId: adminReq.adminId,
        adminName: adminReq.adminName,
        adminIp: getClientIp(req),
        action: "admin_otp_global_disable",
        resourceType: "otp_config",
        resource: "global_disable",
        details: `Disabled OTP for ${minutes} minutes`,
      },
      () => UserService.disableOtpGlobally(minutes)
    );

    writeAuthAuditLog("admin_otp_global_disable", {
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"] ?? undefined,
      metadata: { adminId: adminReq.adminId, minutes, disabledUntil: result.disabledUntil, result: "success" },
    });

    sendSuccess(res, result);
  } catch (error: any) {
    const errMsg = error.message || String(error);
    sendValidationError(res, errMsg);
  }
});

/* ─── DELETE /admin/otp/disable ───────────────────────────────────────────── */
router.delete("/otp/disable", async (req, res) => {
  const adminReq = req as AdminRequest;

  try {
    const result = await AuditService.executeWithAudit(
      {
        adminId: adminReq.adminId,
        adminName: adminReq.adminName,
        adminIp: getClientIp(req),
        action: "admin_otp_global_restore",
        resourceType: "otp_config",
        resource: "global_restore",
        details: "Restored global OTP (early restore)",
      },
      () => UserService.restoreOtpGlobally()
    );

    writeAuthAuditLog("admin_otp_global_restore", {
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"] ?? undefined,
      metadata: { adminId: adminReq.adminId, result: "success" },
    });

    sendSuccess(res, result);
  } catch (error: any) {
    const errMsg = error.message || String(error);
    sendValidationError(res, errMsg);
  }
});

/* ─── GET /admin/otp/audit ─────────────────────────────────────────────── */
router.get("/otp/audit", async (req, res) => {
  const { userId, from, to, page } = req.query as Record<string, string>;

  try {
    const result = await UserService.getOtpAuditLog({
      userId,
      from,
      to,
      page: page ? parseInt(page, 10) : undefined,
    });
    sendSuccess(res, result);
  } catch (error: any) {
    const errMsg = error.message || String(error);
    if (errMsg.includes("Invalid")) {
      res.status(400).json({ error: "Failed to fetch OTP audit log", details: errMsg });
    } else {
      res.status(500).json({ error: "Failed to fetch OTP audit log", details: errMsg });
    }
  }
});

/* ─── GET /admin/otp/channels ─────────────────────────────────────────────── */
router.get("/otp/channels", async (_req, res) => {
  try {
    const result = await UserService.getOtpChannels();
    sendSuccess(res, result);
  } catch (error: any) {
    sendValidationError(res, error.message || String(error));
  }
});

/* ─── PATCH /admin/otp/channels ───────────────────────────────────────────── */
router.patch("/otp/channels", async (req, res) => {
  const { channels } = req.body;
  const adminReq = req as AdminRequest;

  try {
    const result = await AuditService.executeWithAudit(
      {
        adminId: adminReq.adminId,
        adminName: adminReq.adminName,
        adminIp: getClientIp(req),
        action: "admin_otp_channels_update",
        resourceType: "otp_config",
        resource: "channels",
        details: `Updated OTP channel priority: ${channels?.join(" → ")}`,
      },
      () => UserService.updateOtpChannels(channels)
    );

    sendSuccess(res, result);
  } catch (error: any) {
    const errMsg = error.message || String(error);
    sendValidationError(res, errMsg);
  }
});

/* ─── POST /admin/users/:id/otp/generate ─────────────────────────────────── */
router.post("/users/:id/otp/generate", async (req, res) => {
  const userId = req.params["id"]!;
  const adminReq = req as AdminRequest;

  try {
    const result = await AuditService.executeWithAudit(
      {
        adminId: adminReq.adminId,
        adminName: adminReq.adminName,
        adminIp: getClientIp(req),
        action: "admin_otp_generate",
        resourceType: "user",
        resource: userId,
        details: `Generated OTP for user ${userId}`,
      },
      () => UserService.generateOtpForUser(userId)
    );

    writeAuthAuditLog("admin_otp_generate", {
      userId,
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"] ?? undefined,
      metadata: { phone: result.phone, adminId: adminReq.adminId },
    });

    sendSuccess(res, { otp: result.otp, expiresAt: result.expiresAt });
  } catch (error: any) {
    const errMsg = error.message || String(error);
    if (errMsg.includes("not found")) {
      sendNotFound(res, "User not found");
    } else {
      sendValidationError(res, errMsg);
    }
  }
});

export default router;
