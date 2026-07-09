import { ethers } from "ethers";
import { env } from "../config/env.js";
import { prisma } from "../db.js";
import { HttpError } from "../lib/errors.js";
import { decryptPrivateKey } from "../lib/encryption.js";
import { supportedTokens } from "../tokens.js";

const erc20Abi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

const provider = new ethers.JsonRpcProvider(env.ETH_RPC_URL, env.CHAIN_ID);


function requireAddress(value: string, field: string) {
  if (!ethers.isAddress(value)) {
    throw new HttpError(400, `${field} must be a valid EVM address.`);
  }
}

export async function getSignerForTgUser(tgUserId: string) {
  const user = await prisma.user.findUnique({ where: { tgUserId } });

  if (!user) {
    throw new HttpError(404, "User wallet not found.");
  }

  const privateKey = decryptPrivateKey({
    encryptedPrivateKey: user.encryptedPrivateKey,
    keyIv: user.keyIv,
    keyAuthTag: user.keyAuthTag
  });

  return {
    user,
    signer: new ethers.Wallet(privateKey, provider)
  };
}

export async function sendEth(tgUserId: string, to: string, amountEth: string) {
  requireAddress(to, "to");

  const { user, signer } = await getSignerForTgUser(tgUserId);
  const tx = await signer.sendTransaction({
    to,
    value: ethers.parseEther(amountEth)
  });

  await prisma.transaction.create({
    data: {
      userId: user.id,
      type: "ETH_SEND",
      fromAddress: user.walletAddress,
      toAddress: ethers.getAddress(to),
      amount: amountEth,
      txHash: tx.hash,
      chainId: env.CHAIN_ID
    }
  });

  return tx;
}

export async function transferErc20(
  tgUserId: string,
  tokenAddress: string,
  to: string,
  amount: string
) {
  requireAddress(tokenAddress, "tokenAddress");
  requireAddress(to, "to");

  const { user, signer } = await getSignerForTgUser(tgUserId);
  const token = new ethers.Contract(tokenAddress, erc20Abi, signer);
  const decimals = Number(await token.decimals());
  const parsedAmount = ethers.parseUnits(amount, decimals);
  const tx = await token.transfer(to, parsedAmount);

  await prisma.transaction.create({
    data: {
      userId: user.id,
      type: "ERC20_TRANSFER",
      fromAddress: user.walletAddress,
      toAddress: ethers.getAddress(to),
      tokenAddress: ethers.getAddress(tokenAddress),
      amount,
      txHash: tx.hash,
      chainId: env.CHAIN_ID
    }
  });

  return tx;
}

export async function getAvailableTokens(tgUserId: string) {
  const { user } = await getSignerForTgUser(tgUserId);
  const ethBalance = await provider.getBalance(user.walletAddress);

  const tokenBalances = await Promise.all(
    supportedTokens.map(async (token) => {
      const contract = new ethers.Contract(token.address, erc20Abi, provider);
      const balance = (await contract.balanceOf(user.walletAddress)) as bigint;

      return {
        ...token,
        balance: ethers.formatUnits(balance, token.decimals),
        rawBalance: balance.toString()
      };
    })
  );

  return [
    {
      symbol: "ETH",
      name: "Ether",
      address: null,
      decimals: 18,
      balance: ethers.formatEther(ethBalance),
      rawBalance: ethBalance.toString()
    },
    ...tokenBalances.filter((token) => token.rawBalance !== "0")
  ];
}
