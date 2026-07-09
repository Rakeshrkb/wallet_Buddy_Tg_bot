# Wallet Buddy TG Bot

TypeScript API for a Telegram wallet budy bot. Users are identified by `tgUserId`, wallets are generated server-side, private keys are encrypted before storage, and transactions are sent through an Ethereum JSON-RPC provider.

## Setup

Start Postgres in docker or locally
Generate 32 random bytes enryption key, base64 encoded by running 
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
run above command in a terminal, paste the output for ENCRYPTION_KEY_BASE64 in env
Go to telegram, search for godfather bot, follow instruction to create a bot, paste the token for TELEGRAM_BOT_TOKEN in env
API_KEYS="dev-secret-key"(optional)

Envs

```bash
PORT=3000
DATABASE_URL="postgresql://postgres:yourPassWord@localhost:5432/wallet_db?schema=public"
ETH_RPC_URL="https://sepolia.infura.io/v3/YOUR_API_KEY"
CHAIN_ID=11155111
ENCRYPTION_KEY_BASE64=KEY_GENERATED_BY_GIVEN_COMMAND
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
```

# Commands

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

## Endpoints

- `GET /health`
- `POST /wallet` creates or returns a wallet for a Telegram user.
- `GET /wallet/:tgUserId` returns the public wallet info.
- `GET /tokens/:tgUserId` returns ETH plus non-zero balances from `src/tokens.ts`.
- `POST /send` transfers native ETH.
- `POST /transfer` transfers an ERC20 token.

Example:

```bash
curl -X POST http://localhost:3000/wallet \
  -H "content-type: application/json" \
  -d '{"tgUserId":"123456"}'
```

```bash
curl -X POST http://localhost:3000/send \
  -H "content-type: application/json" \
  -d '{"tgUserId":"123456","to":"0x0000000000000000000000000000000000000000","amountEth":"0.001"}'
```

```bash
curl -X POST http://localhost:3000/transfer \
  -H "content-type: application/json" \
  -d '{"tgUserId":"123456","tokenAddress":"0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238","to":"0x0000000000000000000000000000000000000000","amount":"1.5"}'
```

## Notes

`GET /tokens/:tgUserId` cannot discover every ERC20 with only a normal RPC URL. It checks ETH and the configured token list in `src/tokens.ts`. For full arbitrary token discovery, add an indexer provider or store token interactions as they happen.

Use `API_KEYS` in `.env` to require `Authorization: Bearer <key>` or `x-api-key` for wallet and transfer endpoints(optional).


Bot commands:

- `/start` shows the WalletBuddy welcome menu.
- `/wallet` creates or returns the user's wallet.
- `/balance` shows ETH and configured token balances.
- `/sendeth <to> <amount>` sends native ETH.
- `/transfer <tokenAddress> <to> <amount>` sends an ERC20 token.

[Project Demo Video](https://drive.google.com/file/d/1Fe6gWAHx6i6FHn7ZQOhPv57aSsUfDRD8/view?usp=drivesdk)

## License

This project Made By Rakesh Kumar Barik