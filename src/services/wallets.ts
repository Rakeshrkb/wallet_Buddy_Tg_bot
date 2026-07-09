import { ethers } from "ethers";
import { prisma } from "../db.js";
import { encryptPrivateKey } from "../lib/encryption.js";

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
