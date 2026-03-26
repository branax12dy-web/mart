import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { rateLimitMiddleware, securityHeadersMiddleware } from "./middleware/security.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

/* Security headers on all responses */
app.use(securityHeadersMiddleware);

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* Dynamic rate limiting — reads settings from DB (cached 30s) */
app.use(rateLimitMiddleware);

app.use("/api", router);

export default app;
