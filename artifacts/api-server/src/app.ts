import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { createProxyMiddleware } from "http-proxy-middleware";
import { runSqlMigrations } from "./services/sqlMigrationRunner.js";
import {
  seedPermissionCatalog,
  seedDefaultRoles,
  backfillAdminRoleAssignments,
} from "./services/permissions.service.js";
import router from "./routes/index.js";

/**
 * Run DB migrations + RBAC seed/backfill before the server begins
 * accepting traffic. SQL migration failure is fatal — we throw so the
 * boot script in `index.ts` exits non-zero rather than silently serving
 * authorization decisions against a half-migrated schema.
 *
 * The RBAC seed is best-effort: a transient seed failure should not
 * block the platform from coming up, but it is logged loudly.
 */
export async function runStartupTasks(): Promise<void> {
  await runSqlMigrations();
  try {
    await seedPermissionCatalog();
    await seedDefaultRoles();
    await backfillAdminRoleAssignments();
    console.log("[startup] RBAC seed + backfill complete");
  } catch (err) {
    console.error("[startup] RBAC seed/backfill failed (continuing):", err);
  }
}

export function createServer() {
  const app = express();
  
  // Trust proxy (for proper IP detection behind reverse proxy/load balancer)
  app.set('trust proxy', 1);

  /* ── Dev-only: proxy sibling apps so the api-server preview can render
        admin / vendor / rider / customer (Expo) at their respective paths.
        Registered BEFORE helmet so the proxied responses carry the
        upstream Vite headers untouched. ─────────────────────────────────── */
  if (process.env.NODE_ENV !== "production") {
    const devProxies: Array<{ prefix: string; target: string; ws?: boolean }> = [
      { prefix: "/admin",    target: `http://127.0.0.1:${process.env.ADMIN_DEV_PORT  ?? "23744"}`, ws: true },
      { prefix: "/vendor",   target: `http://127.0.0.1:${process.env.VENDOR_DEV_PORT ?? "21463"}`, ws: true },
      { prefix: "/rider",    target: `http://127.0.0.1:${process.env.RIDER_DEV_PORT  ?? "22969"}`, ws: true },
      { prefix: "/__mockup", target: `http://127.0.0.1:${process.env.MOCKUP_DEV_PORT ?? "8081"}`,  ws: true },
    ];
    for (const p of devProxies) {
      // Mount at root with a path filter so the original `/admin/...` URL is
      // forwarded as-is (Express's app.use(prefix) strips the prefix from
      // req.url, which then collides with Vite's `base` and causes a redirect
      // loop). Filter ensures we only intercept the prefix paths.
      app.use(
        createProxyMiddleware({
          target: p.target,
          changeOrigin: true,
          ws: p.ws,
          xfwd: true,
          logger: undefined,
          pathFilter: (pathname) =>
            pathname === p.prefix ||
            pathname.startsWith(p.prefix + "/") ||
            pathname.startsWith(p.prefix + "?"),
          on: {
            error: (err, _req, res) => {
              if (res && "writeHead" in res && !(res as any).headersSent) {
                (res as any).writeHead(502, { "Content-Type": "text/plain" });
                (res as any).end(
                  `Dev proxy error for ${p.prefix} → ${p.target}\n${(err as Error).message}\n` +
                  `Make sure the corresponding workflow is running.`
                );
              }
            },
          },
        }) as unknown as express.RequestHandler,
      );
    }
    console.log("[dev] Sibling app proxies enabled at /admin /vendor /rider /customer /__mockup");
  }

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

  /* ── Dev-only fallback: proxy any remaining non-/api request to the
        Expo (customer / ajkmart) dev server, which serves the customer app
        at the root path. Only kicks in in development, AFTER the
        /admin /vendor /rider /__mockup proxies and the /api router. ─────── */
  if (process.env.NODE_ENV !== "production") {
    const expoTarget = `http://127.0.0.1:${process.env.EXPO_DEV_PORT ?? "20716"}`;
    const expoProxy = createProxyMiddleware({
      target: expoTarget,
      changeOrigin: true,
      ws: true,
      xfwd: true,
      logger: undefined,
      pathFilter: (pathname) =>
        pathname !== "/health" &&
        !pathname.startsWith("/api") &&
        !pathname.startsWith("/admin") &&
        !pathname.startsWith("/vendor") &&
        !pathname.startsWith("/rider") &&
        !pathname.startsWith("/__mockup"),
      on: {
        error: (err, _req, res) => {
          if (res && "writeHead" in res && !(res as any).headersSent) {
            (res as any).writeHead(502, { "Content-Type": "text/plain" });
            (res as any).end(
              `Dev proxy error → ${expoTarget}\n${(err as Error).message}\n` +
              `Make sure the artifacts/ajkmart: expo workflow is running.`
            );
          }
        },
      },
    }) as unknown as express.RequestHandler;
    app.use(expoProxy);
  }

  /* ── Global error handler ──────────────────────────────────────────────── */
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  });
  
  return app;
}
