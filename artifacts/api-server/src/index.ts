import "dotenv/config";
import { createServer } from "./app.js";

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
