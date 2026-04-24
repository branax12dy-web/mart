import "dotenv/config";
import { createServer, runStartupTasks } from "./app.js";

process.on("unhandledRejection", (reason, promise) => {
  console.error("[UnhandledRejection] at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[UncaughtException] Error:", err);
});

const rawPort = process.env.PORT;
if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}
const port = parseInt(rawPort, 10);

const server = createServer();

// Run DB migrations + RBAC seed/backfill BEFORE accepting traffic so we
// never serve authorization decisions against an un-migrated schema.
// A migration failure exits non-zero — the platform should restart us.
runStartupTasks()
  .then(() => {
    server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch(err => {
    console.error("[startup] fatal — refusing to start:", err);
    process.exit(1);
  });
