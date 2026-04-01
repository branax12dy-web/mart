import http from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { startDispatchEngine } from "./routes/rides.js";
import { migrateAdminSecrets } from "./services/adminSecretMigration.js";
import { initSocketIO } from "./lib/socketio.js";
import { ensureAuthMethodColumn } from "./routes/admin.js";

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

ensureAuthMethodColumn()
  .then(() => {
    httpServer.listen(port, () => {
      logger.info({ port }, "Server listening");
      startDispatchEngine();
      migrateAdminSecrets().catch(e => logger.error({ err: e }, "Admin secret migration failed"));
    });
  })
  .catch(e => {
    logger.error({ err: e }, "Failed to run auth_method column migration");
    process.exit(1);
  });

httpServer.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
