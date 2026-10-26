# ShiftRelay

A private, interactive PTO handover pilot. Capture a note, extract responsibilities, review a draft, request coverage, independently confirm dates and tasks, resolve questions, and inspect an audit trail.

**Pilot boundary:** teammate identities and calendar acceptance are simulated using an explicitly labeled persona switch. Emails go to a demo outbox, never a real recipient. Each signed-in Site visitor has a separate durable workspace. Do not treat demo acceptance as another employee's actual consent.

## Architecture

- React + TypeScript responsive frontend (`app/page.tsx`).
- TypeScript route handlers on Vinext / Cloudflare Workers (not FastAPI).
- D1 persistent storage with user isolation and optimistic concurrency (`lib/shiftrelay/store.ts`).
- Pure state machine and readiness checks (`lib/shiftrelay/domain.ts`).
- Nebius Token Factory structured extraction, exact quote validation, one bounded repair attempt (`lib/shiftrelay/agent.ts`).
- Read-only MCP server (`app/mcp/route.ts`) with `list_handovers`, `get_handover`, `validate_coverage`.
- Configurable outbound MCP transport (`lib/shiftrelay/mcp-client.ts`), supporting initialization, sessions, JSON/SSE response parsing, timeout and tool allowlist. Not wired to real email/calendar providers.
- Browser-native optional speech recognition. Provider availability varies; text always works. Speech may be processed by the browser vendor.

## Run locally

Requires Node 22.13+ and pnpm. Install dependencies with `pnpm install`. The project includes the Sites runtime integration.

```
pnpm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_perfect_natasha_romanoff.sql
pnpm run dev
```

The development build uses a local development workspace when no identity is present. This fallback is compiled out of production. Hosted APIs require Sites identity headers supplied by the platform. Do not expose a standalone production Worker outside its trusted authentication gateway.

## Test

```
node --experimental-strip-types --test tests/domain.test.ts
node node_modules/typescript/bin/tsc --noEmit
pnpm run build
```

Tests cover independent acceptance requirements, date/scope invalidation, declines, blocking questions, idempotent demo delivery, role guards, invalid date ranges and immutability.

## Enable NVIDIA inference

Configure server-side `NEBIUS_API_KEY` and `NEBIUS_MODEL` using the hosting secret manager. Select an NVIDIA model ID actually enabled in your Token Factory account; the pilot requires the `nvidia/` namespace. No credentials belong in browser code or Git.

Endpoint: `https://api.tokenfactory.nebius.com/v1/chat/completions`.

Choose **Live NVIDIA / Nebius** in New handover. Every live response must pass the schema and exact source-quote checks. API failures are shown explicitly and do not silently fall back to demo. Without secrets, the explicitly labeled rule-based parser lets you exercise the complete workflow.

A successful live inference call is still required before claiming NVIDIA/Nebius integration works or submitting to the hackathon. No real inference performance has been measured in this initial delivery.

## Demo script (under three minutes)

1. Open Overview: Acme launch has incomplete coverage.
2. Switch to teammate demo; confirm dates. Readiness stays incomplete.
3. Accept the pending responsibility. The open clarification still blocks readiness.
4. Switch to owner; answer the demo-deck question. Coverage becomes ready.
5. Change PTO dates. Dates and task acceptance are invalidated.
6. Preview a handover email and queue it in the demo outbox. Inspect Activity.
7. Create a new handover using the example note, edit extracted tasks and save.
8. Connections shows the exact implementation status. Export coverage dates as ICS if useful.

## MCP

POST `/mcp` supports `server/discover` (2026-07-28), legacy `initialize` (2025-03-26), `tools/list` and `tools/call`. Sites handles authentication. Only read-only tools are exposed, and results are scoped to the authenticated visitor. Discovery/listing may return metadata without a user; data calls require identity.

Example body after authenticating through the platform:

```json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"validate_coverage","arguments":{"id":"acme"}}}
```

## Before a real team pilot

1. Implement shared team membership and server-verified assignee identity. Remove the demo persona switch for real records.
2. Verify provider eligibility and scopes. Add email/calendar adapters with preview, explicit send consent, provider response checks, RSVP reconciliation and idempotency keys.
3. Implement reminders with a scheduler, explicit standing authority, expiry and action receipts. No background reminders currently run.
4. Add durable document links with access verification. The current draft preserves note evidence, not Drive retrieval.
5. Add rate limits, data retention/deletion controls, account-specific tests and monitoring.
6. Run live NVIDIA and provider integration tests with synthetic data.

The endpoint and transport scaffolding do not constitute a connected email/calendar account. Platform connector eligibility could not be checked in the authoring environment, so those integrations were intentionally left simulated.

## License

MIT. See LICENSE.
