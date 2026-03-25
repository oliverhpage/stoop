# Stoop — Find Licensed Contractors Through Your AI Assistant

Stoop is an MCP server that turns AI conversations into real contractor matches. Ask Claude for a plumber, HVAC tech, or electrician in Miami — get 3 licensed, rated providers with phone numbers and pricing, instantly.

No more Googling. No more opening 5 tabs. No more calling random numbers.

## How It Works

You ask Claude something like:

> "My kitchen faucet is leaking, I need a plumber in Miami"

Stoop returns 3 verified providers ranked by license status, ratings, proximity, and pricing — with direct call/text links.

**What you get:**
- Licensed providers verified against the Florida DBPR database
- Star ratings and review counts from Google Places + Yelp
- Price ranges for your specific service
- Phone numbers with one-tap call/text
- Emergency detection (burst pipes get different results than tune-ups)

## Quick Setup (2 minutes)

### Claude Desktop

Add this to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "stoop": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://stoop-mcp-server.stoop.workers.dev/mcp"
      ]
    }
  }
}
```

Restart Claude Desktop. You're done.

### Verify It Works

Ask Claude any of these:
- "I need a plumber in Miami"
- "My AC stopped working, it's 95 degrees"
- "Emergency! Pipe burst in my basement"
- "Find an electrician near Coral Gables for a panel upgrade"

## What Stoop Searches

| Trade | Coverage | License Type |
|-------|----------|-------------|
| Plumbing | 234 providers | FL CFC License |
| Electrical | 230 providers | FL EC License |
| HVAC | 175 providers | FL CAC License |

All providers are in the Miami-Dade and Broward County metro area. Data sourced from Google Places, Yelp Fusion, and the Florida Department of Business and Professional Regulation (DBPR).

## MCP Tools

Stoop exposes 4 tools via the Model Context Protocol:

| Tool | Description |
|------|-------------|
| `service_search` | Search for providers by trade, location, urgency, and budget |
| `provider_profile` | Get detailed info on a specific provider (license, hours, reviews) |
| `home_profile` | Store your home details to improve future matches |
| `job_history` | View your past searches and contacts |

## How Ranking Works

Providers are scored on a 100-point scale:

| Factor | Points | Notes |
|--------|--------|-------|
| Active FL license | 30 | Verified against DBPR |
| Star rating | 0–20 | Scaled from Google/Yelp rating |
| Review count | 0–15 | Log scale, caps at ~150 reviews |
| Proximity | 0–15 | 1 point per mile closer |
| Availability | 10 | Assumed available in v1 |
| Price match | 10 | Within your budget |
| Emergency boost | +15 | For urgent requests only |

## Tech Stack

- **Runtime:** Cloudflare Workers (global edge)
- **Database:** Supabase PostgreSQL + PostGIS
- **Intent Parsing:** Keyword-first with Claude Sonnet fallback
- **Data Sources:** Google Places API, Yelp Fusion API, FL DBPR
- **UI Components:** React 19 MCP App cards with text/markdown fallback
- **Monorepo:** Turborepo with shared TypeScript packages

## Current Coverage

Miami metro only (Miami-Dade + Broward County). Three trades: HVAC, Plumbing, Electrical.

More cities and trades coming based on demand.

## Privacy

- Your search queries are stored for analytics (improving results)
- No personal information is sent to the LLM — only the query text
- Provider data comes from public sources (Google, Yelp, state licensing databases)
- You can request data deletion at any time

## Contributing

This is an early-stage product. Issues and feedback welcome at [github.com/oliverhpage/stoop/issues](https://github.com/oliverhpage/stoop/issues).

## License

MIT
