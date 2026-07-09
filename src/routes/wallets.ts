import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../lib/errors.js";
import { createWalletForTgUser, getWalletForTgUser } from "../services/wallets.js";
import { getAvailableTokens, sendEth, transferErc20 } from "../services/ethereum.js";

const router = Router();

const tgUserSchema = z.object({
  tgUserId: z.string().min(1).max(64)
});

router.post("/wallet", async (req, res, next) => {
  try {
    const { tgUserId } = tgUserSchema.parse(req.body);
    const result = await createWalletForTgUser(tgUserId);

    res.status(result.created ? 201 : 200).json({
      created: result.created,
      tgUserId: result.user.tgUserId,
      walletAddress: result.user.walletAddress
    });
  } catch (err) {
    next(err);
  }
});

router.get("/wallet/:tgUserId", async (req, res, next) => {
  try {
    const { tgUserId } = tgUserSchema.parse(req.params);
    const wallet = await getWalletForTgUser(tgUserId);

    if (!wallet) {
      throw new HttpError(404, "User wallet not found.");
    }

    res.json(wallet);
  } catch (err) {
    next(err);
  }
});

router.get("/tokens/:tgUserId", async (req, res, next) => {
  try {
    const { tgUserId } = tgUserSchema.parse(req.params);
    const tokens = await getAvailableTokens(tgUserId);

    res.json({ tgUserId, tokens });
  } catch (err) {
    next(err);
  }
});

router.post("/send", async (req, res, next) => {
  try {
    const body = z.object({
      tgUserId: z.string().min(1).max(64),
      to: z.string().min(1),
      amountEth: z.string().regex(/^\d+(\.\d+)?$/)
    }).parse(req.body);

    const tx = await sendEth(body.tgUserId, body.to, body.amountEth);

    res.status(202).json({
      txHash: tx.hash,
      from: tx.from,
      to: tx.to,
      amountEth: body.amountEth
    });
  } catch (err) {
    next(err);
  }
});

router.post("/transfer", async (req, res, next) => {
  try {
    const body = z.object({
      tgUserId: z.string().min(1).max(64),
      tokenAddress: z.string().min(1),
      to: z.string().min(1),
      amount: z.string().regex(/^\d+(\.\d+)?$/)
    }).parse(req.body);

    const tx = await transferErc20(
      body.tgUserId,
      body.tokenAddress,
      body.to,
      body.amount
    );

    res.status(202).json({
      txHash: tx.hash,
      from: tx.from,
      to: tx.to,
      tokenAddress: body.tokenAddress,
      amount: body.amount
    });
  } catch (err) {
    next(err);
  }
});

export default router;
