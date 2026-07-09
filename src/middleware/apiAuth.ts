import type { NextFunction, Request, Response } from "express";
import { apiKeys } from "../config/env.js";
import { HttpError } from "../lib/errors.js";

export function apiAuth(req: Request, _res: Response, next: NextFunction) {
  if (apiKeys.size === 0) {
    next();
    return;
  }

  const authHeader = req.header("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : req.header("x-api-key");

  if (!token || !apiKeys.has(token)) {
    next(new HttpError(401, "Unauthorized"));
    return;
  }

  next();
}
