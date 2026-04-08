import http from "http";
import cron from "node-cron";
import app, { initApp } from "./app";
import { logger } from "./lib/logger";
import { startDispatchEngine, dispatchScheduledRides } from "./routes/rides.js";
import { migrateAdminSecrets } from "./services/adminSecretMigration.js";
import { initSocketIO } from "./lib/socketio.js";
import { ensureAuthMethodColumn, ensureRideBidsMigration, ensureOrdersGpsColumns, ensurePromotionsTables, ensureSupportMessagesTable, ensureFaqsTable, ensureCommunicationTables, ensureVendorLocationColumns, ensureVanServiceUpgrade, ensureWalletP2PColumns, ensureComplianceTables } from "./routes/admin.js";
import { sendVanDepartureReminders } from "./routes/van.js";
import { initVapid } from "./lib/webpush.js";
import { db } from "@workspace/db";
import { getPlatformSettings } from "./routes/admin.js";
import { locationLogsTable, pendingOtpsTable } from "@workspace/db/schema";
import { lt } from "drizzle-orm";
import { cleanupExpiredBackups, runAutoResolve, ensureErrorResolutionTables, getAutoResolveSettings, setOnAutoResolveSettingsChanged } from "./routes/error-reports.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = http.createServer(app);
initSocketIO(httpServer);
initVapid();

/* ── Helper: resolve regional timezone from platform settings ── */
async function getCronTimezone(): Promise<string> {
  try {
    const s = await getPlatformSettings();
    return s["regional_timezone"] ?? "Asia/Karachi";
  } catch { return "Asia/Karachi"; }
}

/* ── Cron bootstrap (reads timezone from settings once at startup) ── */
(async () => {
  const tz = await getCronTimezone();

  cron.schedule("* * * * *", () => {
    dispatchScheduledRides().catch(e => logger.error({ err: e }, "[cron] dispatchScheduledRides failed"));
  }, { timezone: tz });

  cron.schedule("* * * * *", () => {
    sendVanDepartureReminders().catch(e => logger.error({ err: e }, "[cron] vanDepartureReminders failed"));
  }, { timezone: tz });

  cron.schedule("0 0 * * *", async () => {
    try {
      const s = await getPlatformSettings();
      const retentionDays = parseInt(s["system_log_retention_days"] ?? "30", 10);
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      const result = await db.delete(locationLogsTable).where(lt(locationLogsTable.createdAt, cutoff));
      logger.info({ cutoff, retentionDays, result }, "[cron] location_logs cleanup complete");
    } catch (e) {
      logger.error({ err: e }, "[cron] location_logs cleanup failed");
    }
    try {
      const result = await db.delete(pendingOtpsTable).where(lt(pendingOtpsTable.otpExpiry, new Date()));
      logger.info({ result }, "[cron] pending_otps cleanup complete");
    } catch (e) {
      logger.error({ err: e }, "[cron] pending_otps cleanup failed");
    }
    try {
      await cleanupExpiredBackups();
    } catch (e) {
      logger.error({ err: e }, "[cron] backup cleanup failed");
    }
  }, { timezone: tz });

  logger.info({ timezone: tz }, "[cron] All cron jobs scheduled");
})();

let autoResolveTimer: ReturnType<typeof setInterval> | null = null;

export async function scheduleAutoResolve() {
  if (autoResolveTimer) {
    clearInterval(autoResolveTimer);
    autoResolveTimer = null;
  }
  try {
    const settings = await getAutoResolveSettings();
    if (!settings.enabled) {
      logger.info("[auto-resolve] disabled, scheduler stopped");
      return;
    }
    const intervalMs = Math.max(30000, settings.intervalMs || 300000);
    autoResolveTimer = setInterval(async () => {
      try {
        const current = await getAutoResolveSettings();
        if (!current.enabled) {
          if (autoResolveTimer) { clearInterval(autoResolveTimer); autoResolveTimer = null; }
          return;
        }
        await runAutoResolve();
      } catch (e) {
        logger.error({ err: e }, "[auto-resolve] run failed");
      }
    }, intervalMs);
    logger.info({ intervalMs }, "[auto-resolve] scheduler started");
  } catch (e) {
    logger.error({ err: e }, "[auto-resolve] scheduler init failed");
  }
}

setOnAutoResolveSettingsChanged(() => {
  scheduleAutoResolve().catch(e => logger.error({ err: e }, "[auto-resolve] reschedule failed"));
});

async function assertSecureSettings() {
  const settings = await getPlatformSettings();
  if (settings["security_otp_bypass"] === "on") {
    logger.fatal("SECURITY: security_otp_bypass is enabled. OTP bypass has been removed; this setting no longer has any effect but must be disabled. Refusing to start.");
    process.exit(1);
  }
}

let _listenAttempt = 0;
const MAX_LISTEN_ATTEMPTS = 10;
const LISTEN_BASE_DELAY_MS = 1000;
const LISTEN_MAX_DELAY_MS = 4000;

function startListening(): void {
  _listenAttempt++;
  httpServer.listen({ port, exclusive: false }, () => {
    logger.info({ port }, "Server listening");
    startDispatchEngine();
    migrateAdminSecrets().catch(e => logger.error({ err: e }, "Admin secret migration failed"));
  });
}

httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE" && _listenAttempt < MAX_LISTEN_ATTEMPTS) {
    const delay = Math.min(LISTEN_BASE_DELAY_MS * Math.pow(2, _listenAttempt - 1), LISTEN_MAX_DELAY_MS);
    logger.warn({ port, attempt: _listenAttempt, nextAttempt: _listenAttempt + 1, delayMs: delay }, "Port in use — retrying with exponential back-off");
    httpServer.close();
    setTimeout(() => startListening(), delay);
  } else {
    logger.error({ err, attempts: _listenAttempt }, "Fatal: could not bind to port after maximum retries");
    process.exit(1);
  }
});

ensureAuthMethodColumn()
  .then(() => ensureRideBidsMigration())
  .then(() => ensureOrdersGpsColumns())
  .then(() => ensurePromotionsTables())
  .then(() => ensureSupportMessagesTable())
  .then(() => ensureFaqsTable())
  .then(() => ensureCommunicationTables())
  .then(() => ensureVendorLocationColumns())
  .then(() => ensureVanServiceUpgrade())
  .then(() => ensureWalletP2PColumns())
  .then(() => ensureComplianceTables())
  .then(() => ensureErrorResolutionTables())
  .then(() => scheduleAutoResolve())
  .then(() => assertSecureSettings())
  .then(() => initApp())
  .then(() => startListening())
  .catch(e => {
    logger.error({ err: e }, "Failed to run startup migrations");
    process.exit(1);
  });
