import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { createTelegramBot } from "./bot/telegram.js";
import { prisma } from "./db.js";

const app = createApp();
const bot = createTelegramBot();

const server = app.listen(env.PORT, () => {
  console.log(`Wallet bot backend listening on port ${env.PORT}`);
});

if (bot) {
  bot.launch()
    .then(() => {
      console.log("Telegram bot started.");
    })
    .catch((error: unknown) => {
      console.error("Telegram bot failed to start:", error);
    });
}

async function shutdown() {
  bot?.stop();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
