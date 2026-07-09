import { Telegraf, type Context } from "telegraf";
import type { InlineKeyboardButton } from "telegraf/types";
import { env } from "../config/env.js";
import { HttpError } from "../lib/errors.js";
import { getAvailableTokens, sendEth, transferErc20 } from "../services/ethereum.js";
import {
  createWalletForTgUser,
  getPrivateKeyForTgUser,
  getWalletForTgUser
} from "../services/wallets.js";

const mainKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "Create wallet", callback_data: "wallet:create" }],
      [{ text: "Show balance", callback_data: "wallet:balance" }],
      [{ text: "Show private key", callback_data: "wallet:private_key" }],
      [
        { text: "Send ETH", callback_data: "wallet:send_eth" },
        { text: "Send ERC20", callback_data: "wallet:send_erc20" }
      ]
    ]
  }
};

function tgUserId(ctx: Context) {
  return String(ctx.from?.id ?? "");
}

function welcomeMessage() {
  return [
    "Welcome to WalletBuddy.",
    "",
    "Here's what I can do for you:",
    "- Create a wallet",
    "- Send ETH",
    "- Send ERC20 tokens",
    "- Show balance of your wallet",
    "",
    "Want a new feature? Message our owner here: @Rakeshstar1",
    "",
    "Commands:",
    "/wallet - create or show your wallet",
    "/balance - show wallet balances",
    "/privatekey - show your private key in two parts",
    "/sendeth <to> <amount> - send ETH",
    "/transfer <tokenAddress> <to> <amount> - send ERC20"
  ].join("\n");
}

function helpSendEth() {
  return [
    "Send ETH like this:",
    "",
    "/sendeth 0xReceiverAddress 0.001"
  ].join("\n");
}

function helpTransfer() {
  return [
    "Send an ERC20 token like this:",
    "",
    "/transfer 0xTokenAddress 0xReceiverAddress 1.5"
  ].join("\n");
}

function formatError(error: unknown) {
  if (error instanceof HttpError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function formatBalances(tokens: Awaited<ReturnType<typeof getAvailableTokens>>) {
  if (tokens.length === 0) {
    return "No token balances found.";
  }

  return tokens
    .map((token) => `${token.symbol}: ${token.balance}`)
    .join("\n");
}

function copyButton(label: string, text: string): InlineKeyboardButton {
  return {
    text: label,
    copy_text: { text }
  } as unknown as InlineKeyboardButton;
}

async function replyWithWalletAddress(
  ctx: Context,
  created: boolean,
  walletAddress: string
) {
  await ctx.reply(
    [
      created ? "Wallet created." : "You already have a wallet.",
      "",
      `Address: ${walletAddress}`
    ].join("\n"),
    {
      reply_markup: {
        inline_keyboard: [[copyButton("Copy address", walletAddress)]]
      }
    }
  );
}

function privateKeyWarning() {
  return [
    "Private key warning:",
    "",
    "Anyone with this key can fully control your wallet.",
    "Only reveal it when you are alone and never share it with anyone.",
    "",
    "Tap confirm if you still want to show it."
  ].join("\n");
}

function splitPrivateKey(privateKey: string) {
  const midpoint = Math.ceil(privateKey.length / 2);

  return {
    firstHalf: privateKey.slice(0, midpoint),
    secondHalf: privateKey.slice(midpoint)
  };
}

async function sendPrivateKeyParts(ctx: Context) {
  try {
    const privateKey = await getPrivateKeyForTgUser(tgUserId(ctx));
    const { firstHalf, secondHalf } = splitPrivateKey(privateKey);

    await ctx.reply(["Private key first half:", firstHalf].join("\n"), {
      reply_markup: {
        inline_keyboard: [[copyButton("Copy first half", firstHalf)]]
      }
    });
    await ctx.reply(["Private key second half:", secondHalf].join("\n"), {
      reply_markup: {
        inline_keyboard: [[copyButton("Copy second half", secondHalf)]]
      }
    });
  } catch (error) {
    await ctx.reply(`Could not show private key: ${formatError(error)}`);
  }
}

export function createTelegramBot() {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.log("Telegram bot disabled. Set TELEGRAM_BOT_TOKEN to enable it.");
    return null;
  }

  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

  bot.use(async (ctx, next) => {
    const from = ctx.from;
    const username = from?.username ? `@${from.username}` : "no-username";

    console.log(
      `Telegram message from ${username} id=${from?.id ?? "unknown"} update=${ctx.updateType}`
    );

    await next();
  });

  bot.start(async (ctx) => {
    await ctx.reply(welcomeMessage(), mainKeyboard);
  });

  bot.help(async (ctx) => {
    await ctx.reply(welcomeMessage(), mainKeyboard);
  });

  bot.command("wallet", async (ctx) => {
    const id = tgUserId(ctx);
    const result = await createWalletForTgUser(id);

    await replyWithWalletAddress(ctx, result.created, result.user.walletAddress);
  });

  bot.command("balance", async (ctx) => {
    try {
      const id = tgUserId(ctx);
      const wallet = await getWalletForTgUser(id);

      if (!wallet) {
        await ctx.reply("Create a wallet first with /wallet.");
        return;
      }

      const tokens = await getAvailableTokens(id);
      await ctx.reply(
        [`Wallet: ${wallet.walletAddress}`, "", formatBalances(tokens)].join("\n")
      );
    } catch (error) {
      await ctx.reply(`Could not load balance: ${formatError(error)}`);
    }
  });

  bot.command("privatekey", async (ctx) => {
    await ctx.reply(privateKeyWarning(), {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Confirm show private key", callback_data: "wallet:private_key_confirm" }]
        ]
      }
    });
  });

  bot.command("sendeth", async (ctx) => {
    const [, to, amountEth] = ctx.message.text.trim().split(/\s+/);

    if (!to || !amountEth) {
      await ctx.reply(helpSendEth());
      return;
    }

    try {
      const tx = await sendEth(tgUserId(ctx), to, amountEth);
      await ctx.reply(`ETH transfer submitted.\nTx: ${tx.hash}`);
    } catch (error) {
      await ctx.reply(`ETH transfer failed: ${formatError(error)}`);
    }
  });

  bot.command("transfer", async (ctx) => {
    const [, tokenAddress, to, amount] = ctx.message.text.trim().split(/\s+/);

    if (!tokenAddress || !to || !amount) {
      await ctx.reply(helpTransfer());
      return;
    }

    try {
      const tx = await transferErc20(tgUserId(ctx), tokenAddress, to, amount);
      await ctx.reply(`ERC20 transfer submitted.\nTx: ${tx.hash}`);
    } catch (error) {
      await ctx.reply(`ERC20 transfer failed: ${formatError(error)}`);
    }
  });

  bot.action("wallet:create", async (ctx) => {
    await ctx.answerCbQuery();
    const result = await createWalletForTgUser(tgUserId(ctx));

    await replyWithWalletAddress(ctx, result.created, result.user.walletAddress);
  });

  bot.action("wallet:balance", async (ctx) => {
    await ctx.answerCbQuery();

    try {
      const id = tgUserId(ctx);
      const wallet = await getWalletForTgUser(id);

      if (!wallet) {
        await ctx.reply("Create a wallet first with /wallet.");
        return;
      }

      const tokens = await getAvailableTokens(id);
      await ctx.reply(
        [`Wallet: ${wallet.walletAddress}`, "", formatBalances(tokens)].join("\n")
      );
    } catch (error) {
      await ctx.reply(`Could not load balance: ${formatError(error)}`);
    }
  });

  bot.action("wallet:private_key", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(privateKeyWarning(), {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Confirm show private key", callback_data: "wallet:private_key_confirm" }]
        ]
      }
    });
  });

  bot.action("wallet:private_key_confirm", async (ctx) => {
    await ctx.answerCbQuery();
    await sendPrivateKeyParts(ctx);
  });

  bot.action("wallet:send_eth", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(helpSendEth());
  });

  bot.action("wallet:send_erc20", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(helpTransfer());
  });

  bot.catch((error) => {
    console.error("Telegram bot error:", error);
  });

  return bot;
}
