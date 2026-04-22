import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { runSqlMigrations } from "./services/sqlMigrationRunner.js";
import router from "./routes/index.js";

export function createServer() {
  const app = express();
  
  app.use(cors());
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
