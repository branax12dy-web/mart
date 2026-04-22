import "dotenv/config";
import { createServer } from "./app.js";

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
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
