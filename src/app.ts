import cors from "cors";
import express from "express";
import helmet from "helmet";
import walletRoutes from "./routes/wallets.js";
import { apiAuth } from "./middleware/apiAuth.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use(apiAuth);
  app.use(walletRoutes);
  app.use(errorHandler);

  return app;
}
