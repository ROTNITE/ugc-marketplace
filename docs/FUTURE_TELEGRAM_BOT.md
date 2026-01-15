# Future Telegram Bot Integration (planned)

We will later add a Telegram bot that can:
- notify creators about new jobs matching their filters
- allow creators to apply quickly (deep-link to web auth)
- allow brands to get status updates and message creators
- optionally: limited admin moderation alerts

## Design principles
- The bot should call the same backend via HTTP APIs.
- Avoid duplicating business logic inside the bot.
- Use a separate service folder later: `/services/bot` or `/apps/bot`.

## Suggested future API endpoints
- GET /api/jobs?platform=...&niche=...
- POST /api/jobs/{id}/apply
- GET /api/me (user profile + role)
- GET /api/conversations
- POST /api/conversations/{id}/messages

## Auth for bot
Options:
1) Telegram login widget on web -> link telegram user id to our user.
2) One-time code flow: bot sends a code -> user enters in web profile.
3) Magic links (email) + optional telegram binding later.

For СНГ audience, we'll likely prioritize:
- Telegram binding via one-time code in profile.

## Binding flow (implemented)
User flow (web):
- POST /api/telegram/bind/code (auth required)
  - returns { code, expiresAt }
  - user sends the code to the bot

Bot flow (server-to-server):
- POST /api/telegram/bind/confirm
  - Authorization: Bearer <TELEGRAM_BINDING_SECRET or OUTBOX_CONSUMER_SECRET>
  - body: { code, telegramUserId, telegramUsername? }

Unlink (web):
- POST /api/telegram/bind/unlink

Notes:
- codes are one-time and expire in 10 minutes
- confirm endpoint creates a TelegramAccount mapping and emits outbox event TELEGRAM_BOUND
