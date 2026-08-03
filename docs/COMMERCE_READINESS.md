# COMMERCE READINESS

Stripe Checkout + entitlement delivery for the IEG Field Manual digital field manual.

## Flow

1. Buyer starts Checkout via `POST /api/checkout` (`/purchase`).
2. Stripe hosts payment; webhook `POST /api/webhooks/commerce` verifies `Stripe-Signature`.
3. On `checkout.session.completed` (paid): mint entitlement + access token, signed manual URL, ACS email (or stub).
4. Buyer opens `/access?token=…` → `GET /api/access/verify` → download via `POST /api/access/download`.
5. Viral invite: `/?invite=CODE` → sample conversions count toward bonus checklist unlock.

## Required app settings

| Variable | Purpose |
|---|---|
| `COMMERCE_ENABLED=true` | Master switch |
| `COMMERCE_PROVIDER=stripe` | Provider |
| `STRIPE_SECRET_KEY` | `sk_test_…` / `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
| `STRIPE_PRICE_DIGITAL` | One-time Price ID |
| `STRIPE_PRICE_TEAM_SEAT` | Optional gift seat Price ID |
| `PUBLIC_COMMERCE_ENABLED=true` | Enables purchase CTAs |
| `TABLE_STORAGE_CONNECTION_STRING` | Durable entitlements (else memory stub) |
| `AZURE_STORAGE_*` + `DASTOR_MANUAL_BLOB_NAME` | Signed full-manual download |
| `AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING` | Access email |

## Stripe MCP

Project `.cursor/mcp.json` and `~/.cursor/mcp.json` load `@stripe/mcp@latest` with `STRIPE_SECRET_KEY` from the environment (never committed). Restart Cursor after exporting a test key, then create Product/Price/Webhook via MCP.

Webhook endpoint: `https://ieg.blocksifr.com/api/webhooks/commerce`  
Events: `checkout.session.completed`, `checkout.session.expired`

## Honesty rules

- No hardcoded dollar amounts in marketing copy.
- CTAs stay disabled with “Commerce configuring” until key + price + `COMMERCE_ENABLED`.
- Full manuscript never ships in the public static bundle.
