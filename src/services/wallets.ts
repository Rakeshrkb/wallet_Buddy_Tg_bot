import { ethers } from "ethers";
import { prisma } from "../db.js";
import { decryptPrivateKey, encryptPrivateKey } from "../lib/encryption.js";
import { HttpError } from "../lib/errors.js";

export async function createWalletForTgUser(tgUserId: string) {
  const existing = await prisma.user.findUnique({ where: { tgUserId } });

  if (existing) {
    return {
      created: false,
      user: existing
    };
  }

  const wallet = ethers.Wallet.createRandom();
  const encrypted = encryptPrivateKey(wallet.privateKey);

  const user = await prisma.user.create({
    data: {
      tgUserId,
      walletAddress: wallet.address,
      ...encrypted
    }
  });

  return {
    created: true,
    user
  };
}

export async function getWalletForTgUser(tgUserId: string) {
  return prisma.user.findUnique({
    where: { tgUserId },
    select: {
      tgUserId: true,
      walletAddress: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function getPrivateKeyForTgUser(tgUserId: string) {
  const user = await prisma.user.findUnique({ where: { tgUserId } });

  if (!user) {
    throw new HttpError(404, "Create a wallet first with /wallet.");
  }

  return decryptPrivateKey({
    encryptedPrivateKey: user.encryptedPrivateKey,
    keyIv: user.keyIv,
    keyAuthTag: user.keyAuthTag
  });
}
