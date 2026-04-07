import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { errorReportsTable } from "@workspace/db/schema";
import { eq, desc, and, gte, lte, count, inArray, ne, type SQL } from "drizzle-orm";
import { generateId } from "../lib/id.js";
import { sendSuccess, sendError, sendNotFound, sendValidationError } from "../lib/response.js";
import { adminAuth, type AdminRequest } from "./admin-shared.js";
import { validateBody } from "../middleware/validate.js";
import { logger } from "../lib/logger.js";

const router = Router();

const VALID_SOURCE_APPS = ["customer", "rider", "vendor", "admin", "api"] as const;
const VALID_ERROR_TYPES = ["frontend_crash", "api_error", "db_error", "route_error", "ui_error", "unhandled_exception"] as const;
const VALID_SEVERITIES = ["critical", "medium", "minor"] as const;
const VALID_STATUSES = ["new", "acknowledged", "in_progress", "resolved"] as const;

type SourceApp = typeof VALID_SOURCE_APPS[number];
type ErrorType = typeof VALID_ERROR_TYPES[number];

function classifySeverity(errorType: ErrorType, statusCode?: number, errorMessage?: string): typeof VALID_SEVERITIES[number] {
  if (errorType === "db_error") return "critical";
  if (errorType === "unhandled_exception") return "medium";
  if (errorType === "ui_error") return "minor";
  if (errorType === "frontend_crash") return "critical";

  const msg = (errorMessage || "").toLowerCase();
  if (msg.includes("auth") || msg.includes("payment") || msg.includes("database")) return "critical";

  if (errorType === "api_error" || errorType === "route_error") {
    if (statusCode && statusCode >= 500) return "critical";
    if (statusCode === 422 || statusCode === 400) return "minor";
    if (statusCode && statusCode >= 400) return "medium";
  }

  return "medium";
}

function classifyImpact(errorType: ErrorType, severity: string): string {
  const impacts: Record<string, Record<string, string>> = {
    frontend_crash: { critical: "App crash — user cannot continue", medium: "Component failure — partial functionality loss", minor: "Minor rendering issue" },
    api_error:      { critical: "Server error — feature unavailable", medium: "Request rejected — user action blocked", minor: "Non-critical API issue" },
    db_error:       { critical: "Database failure — data operations blocked", medium: "Database query issue", minor: "Minor database issue" },
    route_error:    { critical: "Route handler failure — endpoint down", medium: "Route error — degraded service", minor: "Minor routing issue" },
    ui_error:       { critical: "UI completely broken", medium: "UI partially broken", minor: "Minor UI glitch" },
    unhandled_exception: { critical: "Unhandled crash — potential data loss", medium: "Unhandled error — unexpected behavior", minor: "Minor unhandled error" },
  };
  return impacts[errorType]?.[severity] || "Error detected — investigation needed";
}

const createErrorReportSchema = z.object({
  sourceApp:     z.enum(VALID_SOURCE_APPS),
  errorType:     z.enum(VALID_ERROR_TYPES),
  severity:      z.enum(VALID_SEVERITIES).optional().transform(() => undefined),
  functionName:  z.string().max(500).optional(),
  moduleName:    z.string().max(500).optional(),
  componentName: z.string().max(500).optional(),
  errorMessage:  z.string().max(5000),
  stackTrace:    z.string().max(50000).optional(),
  metadata:      z.record(z.unknown()).optional(),
  statusCode:    z.number().optional(),
});

router.post("/", validateBody(createErrorReportSchema), async (req, res) => {
  try {
    const body = req.body;
    const severity = classifySeverity(body.errorType, body.statusCode, body.errorMessage);
    const shortImpact = classifyImpact(body.errorType, severity);

    const id = generateId();
    const [report] = await db.insert(errorReportsTable).values({
      id,
      sourceApp: body.sourceApp,
      errorType: body.errorType,
      severity,
      functionName: body.functionName || null,
      moduleName: body.moduleName || null,
      componentName: body.componentName || null,
      errorMessage: body.errorMessage,
      shortImpact,
      stackTrace: body.stackTrace || null,
      metadata: body.metadata || null,
    }).returning();

    sendSuccess(res, report, undefined, 201);
  } catch (err) {
    logger.error({ err }, "Failed to store error report");
    sendError(res, "Failed to store error report", 500);
  }
});

router.get("/", adminAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query["page"] || "1")));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query["limit"] || "50"))));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    const sourceApp = req.query["sourceApp"] as string | undefined;
    if (sourceApp && (VALID_SOURCE_APPS as readonly string[]).includes(sourceApp)) {
      conditions.push(eq(errorReportsTable.sourceApp, sourceApp as SourceApp));
    }

    const severity = req.query["severity"] as string | undefined;
    if (severity && (VALID_SEVERITIES as readonly string[]).includes(severity)) {
      conditions.push(eq(errorReportsTable.severity, severity as typeof VALID_SEVERITIES[number]));
    }

    const statusParam = req.query["status"];
    const statusValues = (Array.isArray(statusParam) ? statusParam : statusParam ? [statusParam] : []) as string[];
    const validStatusValues = statusValues.filter(s => (VALID_STATUSES as readonly string[]).includes(s)) as typeof VALID_STATUSES[number][];
    if (validStatusValues.length === 1) {
      conditions.push(eq(errorReportsTable.status, validStatusValues[0]!));
    } else if (validStatusValues.length > 1) {
      conditions.push(inArray(errorReportsTable.status, validStatusValues));
    }

    const errorType = req.query["errorType"] as string | undefined;
    if (errorType && (VALID_ERROR_TYPES as readonly string[]).includes(errorType)) {
      conditions.push(eq(errorReportsTable.errorType, errorType as ErrorType));
    }

    const dateFrom = req.query["dateFrom"] as string;
    if (dateFrom) {
      const d = new Date(dateFrom);
      if (!isNaN(d.getTime())) conditions.push(gte(errorReportsTable.timestamp, d));
    }

    const dateTo = req.query["dateTo"] as string;
    if (dateTo) {
      const d = new Date(dateTo);
      if (!isNaN(d.getTime())) conditions.push(lte(errorReportsTable.timestamp, d));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [reports, [totalRow]] = await Promise.all([
      db.select().from(errorReportsTable)
        .where(where)
        .orderBy(desc(errorReportsTable.timestamp))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(errorReportsTable).where(where),
    ]);

    const total = totalRow?.count ?? 0;

    sendSuccess(res, {
      reports: reports.map(r => ({
        ...r,
        timestamp: r.timestamp.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString() || null,
        acknowledgedAt: r.acknowledgedAt?.toISOString() || null,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch error reports");
    sendError(res, "Failed to fetch error reports", 500);
  }
});

router.get("/new-count", adminAuth, async (_req, res) => {
  try {
    const [row] = await db.select({ count: count() })
      .from(errorReportsTable)
      .where(eq(errorReportsTable.status, "new"));
    sendSuccess(res, { count: row?.count ?? 0 });
  } catch (err) {
    logger.error({ err }, "Failed to fetch new error count");
    sendError(res, "Failed to fetch new error count", 500);
  }
});

router.post("/bulk-resolve", adminAuth, async (req, res) => {
  try {
    const { sourceApp, severity, errorType, statusFilter } = req.body as {
      sourceApp?: string;
      severity?: string;
      errorType?: string;
      statusFilter?: string[];
    };

    const conditions: SQL[] = [];

    if (sourceApp && (VALID_SOURCE_APPS as readonly string[]).includes(sourceApp)) {
      conditions.push(eq(errorReportsTable.sourceApp, sourceApp as SourceApp));
    }
    if (severity && (VALID_SEVERITIES as readonly string[]).includes(severity)) {
      conditions.push(eq(errorReportsTable.severity, severity as typeof VALID_SEVERITIES[number]));
    }
    if (errorType && (VALID_ERROR_TYPES as readonly string[]).includes(errorType)) {
      conditions.push(eq(errorReportsTable.errorType, errorType as ErrorType));
    }

    if (statusFilter && statusFilter.length > 0) {
      const validStatuses = statusFilter.filter(s => (VALID_STATUSES as readonly string[]).includes(s));
      if (validStatuses.length > 0) {
        conditions.push(inArray(errorReportsTable.status, validStatuses as typeof VALID_STATUSES[number][]));
      }
    } else {
      conditions.push(ne(errorReportsTable.status, "resolved"));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const updated = await db.update(errorReportsTable)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(where)
      .returning({ id: errorReportsTable.id });

    sendSuccess(res, { resolvedCount: updated.length });
  } catch (err) {
    logger.error({ err }, "Failed to bulk resolve error reports");
    sendError(res, "Failed to bulk resolve error reports", 500);
  }
});

const STATUS_TRANSITIONS: Record<string, string> = {
  new: "acknowledged",
  acknowledged: "in_progress",
  in_progress: "resolved",
};

const updateStatusSchema = z.object({
  status: z.enum(VALID_STATUSES),
});

router.patch("/:id", adminAuth, validateBody(updateStatusSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { status: newStatus } = req.body;

    const [existing] = await db.select({ status: errorReportsTable.status })
      .from(errorReportsTable)
      .where(eq(errorReportsTable.id, id!))
      .limit(1);

    if (!existing) {
      sendNotFound(res, "Error report not found");
      return;
    }

    const allowedNext = STATUS_TRANSITIONS[existing.status];
    if (newStatus !== allowedNext) {
      sendError(
        res,
        `Invalid transition: cannot move from '${existing.status}' to '${newStatus}'. Expected next step: '${allowedNext ?? "none (already resolved)"}'.`,
        400,
      );
      return;
    }

    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "acknowledged") {
      updates.acknowledgedAt = new Date();
    } else if (newStatus === "resolved") {
      updates.resolvedAt = new Date();
    }

    const [updated] = await db.update(errorReportsTable)
      .set(updates)
      .where(eq(errorReportsTable.id, id!))
      .returning();

    if (!updated) {
      sendNotFound(res, "Error report not found");
      return;
    }

    sendSuccess(res, {
      ...updated,
      timestamp: updated.timestamp.toISOString(),
      resolvedAt: updated.resolvedAt?.toISOString() || null,
      acknowledgedAt: updated.acknowledgedAt?.toISOString() || null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to update error report");
    sendError(res, "Failed to update error report", 500);
  }
});

export default router;

export { classifySeverity, classifyImpact, VALID_SOURCE_APPS, VALID_ERROR_TYPES };
