# Stoop — MCP Home Services Intelligence Layer

## What is this?
MCP server that matches homeowners with licensed service providers (HVAC, Plumbing, Electrical) in Miami. Users ask their AI assistant for help → Stoop returns ranked, verified provider cards.

## Project Structure
- `apps/mcp-server/` — Cloudflare Worker MCP server
- `apps/mcp-ui/` — React MCP App card components
- `packages/shared/` — Types, categories, geo utilities
- `packages/matching/` — Intent parsing + ranking engine
- `packages/db/` — Supabase client + migrations
- `supabase/` — Database migrations and config
- `docs/superpowers/specs/` — Design spec
- `docs/superpowers/plans/` — Implementation plans

## Commands
- `npm install` — Install all dependencies
- `npx turbo test` — Run all tests
- `npx turbo typecheck` — Type check all packages
- `npx turbo lint` — Lint all packages
- `cd apps/mcp-server && npx wrangler dev` — Run MCP server locally
- `cd apps/mcp-server && npx wrangler deploy` — Deploy to Cloudflare

## Key Conventions
- TypeScript everywhere. Zod for runtime validation.
- Shared types in `@stoop/shared`. Import from there, not local redefinitions.
- Tests live next to source in `__tests__/` directories. Use Vitest.
- MCP tools defined in `apps/mcp-server/src/tools/`. One file per tool.
- All database tables defined in `supabase/migrations/`. Never modify schema outside migrations.
- Text fallback for every MCP App card (Claude sandbox may block React rendering).

## Commands (Pipeline)
- `npx tsx scripts/test-intent-accuracy.ts` — Run 200-query accuracy test (>90% target)
- `npx tsx scripts/seed-miami.ts --dry-run` — Dry-run provider data seed
- `SUPABASE_URL=x SUPABASE_SERVICE_ROLE_KEY=y GOOGLE_PLACES_API_KEY=z YELP_API_KEY=w npx tsx scripts/seed-miami.ts` — Real seed

## Current State
- **Ring 1, Sprint 1** — Foundation complete. Monorepo, schema, CI/CD.
- **Ring 1, Sprint 2** — Complete. 148 tests passing.
  - Smart intent parser (keyword-first, Claude Sonnet fallback)
  - Google Places + Yelp + FL DBPR data pipelines
  - Cross-source dedup (Jaro-Winkler + phone matching)
  - Geocoding with Supabase cache
  - Real `service_search` wired: parse → geocode → PostGIS → rank → top 3 → analytics
  - Cron-triggered pipeline orchestration
  - 200-query accuracy harness (100% category accuracy)
  - Miami seed script with --dry-run
- **Ring 1, Sprint 3** — Complete. 189 tests passing. RING 1 DONE.
  - MCP SDK integration (tool definitions, protocol handler, Streamable HTTP)
  - Contact deep links (SMS/call with pre-filled job details + event logging)
  - ProviderMatchCard expanded state (license details, hours, stale data warnings)
  - Loading skeletons (pulse animation, configurable count)
  - Error states (no results, coming soon, generic error)
  - Auth prompt (sign-up after first search)
  - Provider profile tool wired to real Supabase data
  - Trade icons (snowflake, wrench, lightning bolt)
## Live Deployment
- **MCP Server:** `https://stoop-mcp-server.stoop.workers.dev`
- **MCP Registry:** `registry.modelcontextprotocol.io/servers/io.github.oliverhpage/stoop`
- **GitHub:** `github.com/oliverhpage/stoop`
- **Supabase:** Project `tpywjihrveenedbpbnpz` (604 real Miami providers seeded)
- **Cloudflare secrets configured:** SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, GOOGLE_PLACES_API_KEY, GOOGLE_GEOCODING_API_KEY, YELP_API_KEY

## Current Phase: Launch & Demand Validation
Ring 1 is shipped and live. Now validating demand before building Ring 2.

**Go/No-Go signal:** 500 organic searches → build Ring 2. Below 500 → stop or pivot.

**What's happening now:**
1. Execute launch playbook (`docs/launch-playbook.md`) — post to r/ClaudeAI, HN, r/Miami, X/Twitter, LinkedIn
2. Monitor analytics daily: `SELECT event_type, COUNT(*) FROM analytics_events GROUP BY event_type`
3. Respond to feedback and feature requests

**Next (only if 500 searches hit):**
- Ring 2: Home Profile persistence, PostHog funnels, Provider Dashboard, follow-up/rating cards
- Ring 2 spec and plan need to be written when the time comes

## Deployment (For Future Deploys)
1. Make code changes, push to main
2. Deploy Worker: `cd apps/mcp-server && npx wrangler deploy`
3. Run migrations if schema changed: paste SQL in Supabase Dashboard SQL Editor
4. Re-seed if needed: `npx tsx scripts/seed-miami.ts`

## Architecture Decisions
- **3 trades:** HVAC + Plumbing + Electrical for Miami launch
- **Keyword-first parsing:** 80% of queries handled by keyword fallback, LLM for ambiguous only
- **Server-side analytics:** Events logged to `analytics_events` table (PostHog can't run in MCP App sandbox)
- **Both React + text fallback:** MCP App cards have markdown fallback for when rendering is limited
- **Auth after first search:** Anonymous `service_search` allowed, sign-up prompted after results
