import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { runSqlMigrations } from "./services/sqlMigrationRunner.js";
import {
  seedPermissionCatalog,
  seedDefaultRoles,
  backfillAdminRoleAssignments,
} from "./services/permissions.service.js";
import router from "./routes/index.js";

/**
 * Run DB migrations + RBAC seed/backfill. Safe to call multiple times.
 * Each step logs and swallows errors so a single failure doesn't block boot.
 */
export async function runStartupTasks(): Promise<void> {
  try {
    await runSqlMigrations();
  } catch (err) {
    console.error("[startup] runSqlMigrations failed:", err);
  }
  try {
    await seedPermissionCatalog();
    await seedDefaultRoles();
    await backfillAdminRoleAssignments();
    console.log("[startup] RBAC seed + backfill complete");
  } catch (err) {
    console.error("[startup] RBAC seed/backfill failed:", err);
  }
}

export function createServer() {
  const app = express();
  
  // Trust proxy (for proper IP detection behind reverse proxy/load balancer)
  app.set('trust proxy', 1);
  
  // Security headers via helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
  }));
  
  // CORS with credentials support
  app.use(cors({
    origin: process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  }));
  
  app.use(cookieParser());
  app.use(express.json({ limit: "256kb" }));
  app.use(express.urlencoded({ extended: true, limit: "256kb" }));
  
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api", router);

  /* ── JSON 404 for unmatched /api/* routes ─────────────────────────────── */
  app.use("/api/*path", (req: express.Request, res: express.Response) => {
    res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  /* ── Global error handler ──────────────────────────────────────────────── */
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  });
  
  return app;
}
