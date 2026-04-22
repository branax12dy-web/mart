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

  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });
  
  return app;
}
