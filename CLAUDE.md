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

## Current State
- **Ring 1, Sprint 1** — Foundation complete. Mock data. 64 tests passing.
- **Next:** Sprint 2 — Intent parser (Claude Sonnet) + provider data pipeline (Google Places, Yelp, FL DBPR).

## Architecture Decisions
- **3 trades:** HVAC + Plumbing + Electrical for Miami launch
- **Keyword-first parsing:** 80% of queries handled by keyword fallback, LLM for ambiguous only
- **Server-side analytics:** Events logged to `analytics_events` table (PostHog can't run in MCP App sandbox)
- **Both React + text fallback:** MCP App cards have markdown fallback for when rendering is limited
- **Auth after first search:** Anonymous `service_search` allowed, sign-up prompted after results
