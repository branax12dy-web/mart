import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { runSqlMigrations } from "./services/sqlMigrationRunner.js";

// Import route handlers (these exist in your project)
import adminRouter from "./routes/admin.js";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";

export function createServer() {
  const app = express();
  
  app.use(cors());
  app.use(cookieParser());
  app.use(express.json({ limit: "256kb" }));
  app.use(express.urlencoded({ extended: true, limit: "256kb" }));
  
  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  
  // Mount API routes
  app.use("/api/admin", adminRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  
  // Run migrations in background (don't block startup)
  // runSqlMigrations().catch(err => console.error("Migration error", err));
  
  return app;
}
