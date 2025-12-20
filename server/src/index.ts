import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";

import { chatRouter } from "./api/chat";
import { env } from "./util/env";
import { logger } from "./util/logger";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api", chatRouter);

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "server listening");
});
