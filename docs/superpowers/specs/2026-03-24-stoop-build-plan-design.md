# Stoop Build Plan & System Design

**Date:** 2026-03-24
**Status:** Draft — Awaiting Review
**Scope:** Full build plan decomposition + Ring 1 (MCP Core) detailed design

---

## 1. Build Strategy: Core-Out Decomposition

The Stoop product consists of 7 subsystems. Rather than building everything in parallel (high risk, high waste if thesis fails), we decompose into three concentric rings built in dependency order. Each ring is independently shippable and has clear exit criteria.

### Ring 1: MCP Core (Weeks 1–6) — THIS SPEC

The thesis validator. Ships the end-to-end flow: user types a home services request in Claude → gets 3 licensed, ranked providers as interactive cards.

**Components:**
- MCP Server (Cloudflare Workers, Streamable HTTP)
- Intent Parser (Claude Sonnet + keyword fallback)
- Provider Data Pipeline (Google Places, Yelp Fusion, FL DBPR scraper)
- Heuristic Ranking Engine
- MCP App UI Cards (React 19 on Cloudflare Pages)
- Supabase schema (all tables, RLS policies)
- CI/CD pipeline (GitHub Actions → Cloudflare + Supabase)

**Exit criteria:** A real user types "I need a plumber in Miami" in Claude and sees 3 licensed, rated providers as interactive cards. Contact button initiates phone/SMS deep link. Contact event logged. Funnel events tracked server-side in `analytics_events` table (PostHog for web apps only — MCP App sandbox may block client-side scripts).

**Kill signal:** If < 500 total searches by end of Ring 1, stop.

**Timeline mapping:** Ring 1 = Architecture Doc Sprints 1–3 = PRD Phase 1 (core subset). Ring 2 = Architecture Doc Sprint 4 = PRD Phase 1 (remainder) + Phase 2 (subset). Ring 3 = Architecture Doc Sprints 5–6 + PRD Phase 2 (remainder).

### Ring 2: Engagement Layer (Weeks 7–10)

Proves conversion and retention. Only built if Ring 1 generates demand.

**Components:**
- Home Profile persistence (cross-session via Supabase Auth)
- PostHog analytics funnel (search → match → contact → booking)
- Basic Provider Dashboard (Next.js, claim flow, lead feed)
- Follow-up / rating cards
- Booking Confirmation card

**Exit criteria:** 15%+ match-to-contact rate, 30%+ repeat usage.

### Ring 3: Full Product (Weeks 11–14)

Only built if Ring 2 metrics hit.

**Components:**
- Homeowner Web App (dashboard, profile, history, saved providers)
- Provider subscription billing (Stripe)
- ChatGPT MCP expansion
- Maintenance reminders (Cloudflare Cron)
- Provider outreach email automation
- Edge case handling + polish

**Exit criteria:** 100+ provider subscriptions, seed-ready metrics package.

---

## 2. Ring 1 Detailed Design

### 2.1 Monorepo Structure

```
stoop/
├── apps/
│   ├── mcp-server/          # Cloudflare Worker — MCP server
│   │   ├── src/
│   │   │   ├── index.ts     # Worker entry, MCP handler
│   │   │   ├── tools/       # Tool handlers
│   │   │   │   ├── service-search.ts
│   │   │   │   ├── provider-profile.ts
│   │   │   │   ├── home-profile.ts
│   │   │   │   └── job-history.ts
│   │   │   ├── matching/    # Intent parser + ranker
│   │   │   │   ├── intent-parser.ts
│   │   │   │   ├── keyword-fallback.ts
│   │   │   │   └── ranker.ts
│   │   │   └── middleware/   # Auth, rate limiting, logging
│   │   ├── wrangler.toml
│   │   └── tsconfig.json
│   ├── mcp-ui/              # React MCP App components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ProviderMatchCard.tsx
│   │   │   │   ├── ServiceRequestSummary.tsx
│   │   │   │   ├── HomeProfileCard.tsx
│   │   │   │   ├── JobHistoryTimeline.tsx
│   │   │   │   └── BookingConfirmation.tsx
│   │   │   └── shared/      # Shared UI primitives
│   │   └── tsconfig.json
│   └── web/                 # Next.js 16 on Vercel (Ring 2+3)
│       └── (deferred)
├── packages/
│   ├── db/                  # Supabase client, migrations, generated types
│   │   ├── migrations/
│   │   ├── seed/            # Miami provider seed data
│   │   └── src/
│   │       ├── client.ts    # Supabase client factory
│   │       └── types.ts     # Generated from schema
│   ├── matching/            # Shared matching logic
│   │   ├── src/
│   │   │   ├── intent-schema.ts   # Zod schemas for parsed intent
│   │   │   ├── ranking.ts         # Heuristic scoring function
│   │   │   └── constants.ts       # Weights, thresholds
│   │   └── tsconfig.json
│   └── shared/              # Cross-package types + utils
│       ├── src/
│       │   ├── types.ts     # Provider, HomeProfile, ServiceRequest, PropertyData Zod schema
│       │   ├── categories.ts # HVAC, Plumbing, etc.
│       │   └── geo.ts       # Haversine distance
│       └── tsconfig.json
├── supabase/
│   ├── config.toml
│   ├── migrations/          # SQL migrations
│   └── functions/           # Edge Functions (pipeline processing)
│       ├── process-google/
│       ├── process-yelp/
│       └── process-dbpr/
├── scripts/
│   ├── seed-miami.ts        # Initial provider data load
│   ├── test-intent-parser.ts # 200-query test harness
│   └── dbpr-scraper.ts      # FL DBPR scraper (Apify actor)
├── .github/
│   └── workflows/
│       ├── ci.yml           # PR checks
│       └── deploy.yml       # Merge to main → deploy
├── turbo.json
├── package.json
├── tsconfig.base.json
└── CLAUDE.md
```

### 2.2 Technology Choices

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| MCP Server Runtime | Cloudflare Workers | Global edge, native MCP support, generous free tier |
| MCP Transport | Streamable HTTP | Modern MCP transport for remote servers |
| Database | Supabase PostgreSQL (Pro $25/mo) | Managed Postgres + Auth + RLS + PostGIS |
| LLM (Intent Parsing) | Claude Sonnet 4.6 (`claude-sonnet-4-6`) | Best cost/quality for structured extraction |
| MCP App UI | React 19 on Cloudflare Pages | Claude renders React natively; team expertise |
| Build System | Turborepo | Monorepo with shared TS types |
| CI/CD | GitHub Actions | PR checks → auto-deploy on merge to main |
| Analytics | PostHog (free tier, 1M events/mo) | Funnels + feature flags |
| Geospatial | PostGIS extension on Supabase | Spatial indexing for provider proximity |
| Data Pipeline | Cloudflare Cron Triggers + Supabase Edge Functions | Scheduled refresh, no servers to manage |
| DBPR Scraping | Apify ($50/mo) | Managed scraping, handles anti-bot |

### 2.3 Data Model

All tables in Supabase PostgreSQL. UUIDs as primary keys. RLS enabled on all user-facing tables.

#### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_auth_id UUID UNIQUE NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'homeowner' CHECK (role IN ('homeowner', 'provider', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_users_auth ON users(supabase_auth_id);
```

#### `home_profiles`
```sql
CREATE TABLE home_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  property_data JSONB DEFAULT '{}',
  -- JSONB validated by PropertyData Zod schema in packages/shared/src/types.ts
  -- See schema below for allowed fields and values
  completeness_score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**PropertyData Zod Schema** (in `packages/shared/src/types.ts`):
```typescript
import { z } from "zod";

export const PropertyDataSchema = z.object({
  type: z.enum(["house", "condo", "townhouse", "other"]).optional(),
  year_built: z.enum(["before_1970", "1970_1990", "1990_2010", "after_2010", "unknown"]).optional(),
  sqft: z.enum(["under_1000", "1000_2000", "2000_3000", "over_3000", "unknown"]).optional(),
  heating_system: z.enum(["gas_furnace", "electric", "heat_pump", "unknown"]).optional(),
  cooling_system: z.enum(["central_ac", "window_units", "mini_split", "none", "unknown"]).optional(),
  water_heater_type: z.enum(["tank_gas", "tank_electric", "tankless", "unknown"]).optional(),
  roof_type: z.enum(["tile", "shingle", "metal", "flat", "unknown"]).optional(),
  sewer_type: z.enum(["septic", "city_sewer", "unknown"]).optional(),
  scheduling_preference: z.enum(["morning", "afternoon", "evening", "no_preference"]).optional(),
  location_geo: z.object({ lat: z.number(), lng: z.number() }).optional(),
  preferred_providers: z.array(z.string()).optional(), // free text provider names
});
export type PropertyData = z.infer<typeof PropertyDataSchema>;
```

#### `providers`
```sql
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  google_place_id TEXT,
  yelp_id TEXT,
  phone TEXT,
  address TEXT,
  location_geo GEOGRAPHY(POINT, 4326),
  categories TEXT[] NOT NULL DEFAULT '{}',
  avg_rating NUMERIC(3,2) CHECK (avg_rating >= 1.0 AND avg_rating <= 5.0),
  review_count INT DEFAULT 0,
  price_range_low INT,
  price_range_high INT,
  hours JSONB,
  photos TEXT[],
  data_freshness_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_providers_geo ON providers USING GIST(location_geo);
CREATE INDEX idx_providers_categories ON providers USING GIN(categories);
CREATE INDEX idx_providers_rating ON providers(avg_rating DESC);
CREATE INDEX idx_providers_google ON providers(google_place_id);
CREATE INDEX idx_providers_yelp ON providers(yelp_id);
```

#### `provider_verifications`
```sql
CREATE TABLE provider_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  license_number TEXT,
  license_type TEXT, -- CAC (HVAC), CFC (Plumbing), EC (Electrical)
  license_status TEXT CHECK (license_status IN ('active', 'inactive', 'expired', 'revoked', 'pending')),
  license_expiry DATE,
  disciplinary_actions JSONB DEFAULT '[]',
  insurance_status TEXT CHECK (insurance_status IN ('verified', 'unverified', 'expired')),
  insurance_verified_at TIMESTAMPTZ,
  dbpr_last_checked TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_verifications_provider ON provider_verifications(provider_id);
CREATE INDEX idx_verifications_license ON provider_verifications(license_number);
```

#### `service_requests`
```sql
CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),  -- nullable for anonymous
  raw_query TEXT NOT NULL,
  parsed_intent JSONB NOT NULL,
  urgency TEXT CHECK (urgency IN ('emergency', 'soon', 'planned')),
  location TEXT,
  location_geo GEOGRAPHY(POINT, 4326),
  category TEXT,
  budget_max INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_requests_user ON service_requests(user_id);
CREATE INDEX idx_requests_created ON service_requests(created_at DESC);
CREATE INDEX idx_requests_category ON service_requests(category);
```

#### `matches`
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES providers(id),
  rank INT NOT NULL CHECK (rank BETWEEN 1 AND 3),
  score NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_matches_request ON matches(service_request_id);
CREATE INDEX idx_matches_provider ON matches(provider_id);
```

#### `contacts`
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id),
  user_id UUID REFERENCES users(id),
  contact_method TEXT CHECK (contact_method IN ('phone', 'sms', 'booking_request')),
  contacted_at TIMESTAMPTZ DEFAULT now(),
  provider_responded_at TIMESTAMPTZ
);
CREATE INDEX idx_contacts_user ON contacts(user_id);
CREATE INDEX idx_contacts_match ON contacts(match_id);
```

#### `analytics_events`
```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_events_type ON analytics_events(event_type, created_at DESC);
CREATE INDEX idx_events_user ON analytics_events(user_id);
-- Partition by month after Ring 1. 90-day retention for raw events; aggregates kept indefinitely.
```

#### `bookings` (Ring 2 — created empty in Sprint 1)
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id),
  status TEXT CHECK (status IN ('confirmed', 'completed', 'cancelled')),
  job_value INT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_bookings_contact ON bookings(contact_id);
CREATE INDEX idx_bookings_status ON bookings(status);
```

#### `reviews` (Ring 2 — created empty in Sprint 1)
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  user_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES providers(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_reviews_provider ON reviews(provider_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
```

#### `provider_subscriptions` (Ring 3 — created empty in Sprint 1)
```sql
CREATE TABLE provider_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id),
  stripe_subscription_id TEXT,
  tier TEXT CHECK (tier IN ('free', 'verified', 'premium')) DEFAULT 'free',
  status TEXT CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_provider_subs_provider ON provider_subscriptions(provider_id);
CREATE INDEX idx_provider_subs_status ON provider_subscriptions(status);
```

> **Note:** All 10 tables are created in Sprint 1 for forward compatibility. Ring 2/3 tables start empty. This avoids breaking migrations later.

#### RLS Policies

```sql
-- Users: can only read/update own record
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_self ON users FOR ALL USING (supabase_auth_id = auth.uid());

-- Home profiles: owner only
ALTER TABLE home_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_owner ON home_profiles FOR ALL USING (
  user_id = (SELECT id FROM users WHERE supabase_auth_id = auth.uid())
);

-- Providers: public read, admin write
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY providers_read ON providers FOR SELECT USING (true);
CREATE POLICY providers_admin_write ON providers FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE supabase_auth_id = auth.uid() AND role = 'admin')
);

-- Provider verifications: public read
ALTER TABLE provider_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY verifications_read ON provider_verifications FOR SELECT USING (true);

-- Service requests: owner or anonymous
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY requests_owner ON service_requests FOR SELECT USING (
  user_id IS NULL OR user_id = (SELECT id FROM users WHERE supabase_auth_id = auth.uid())
);
CREATE POLICY requests_insert ON service_requests FOR INSERT WITH CHECK (true);

-- Matches: via service_request ownership
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY matches_read ON matches FOR SELECT USING (
  service_request_id IN (
    SELECT id FROM service_requests WHERE user_id IS NULL
    OR user_id = (SELECT id FROM users WHERE supabase_auth_id = auth.uid())
  )
);

-- Contacts: owner only
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY contacts_owner ON contacts FOR ALL USING (
  user_id = (SELECT id FROM users WHERE supabase_auth_id = auth.uid())
);

-- Analytics: insert-only for all, read for admin
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_insert ON analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY events_admin_read ON analytics_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE supabase_auth_id = auth.uid() AND role = 'admin')
);
```

### 2.4 MCP Server Implementation

#### Transport & Auth
- **Transport:** Streamable HTTP on Cloudflare Workers
- **Auth:** OAuth 2.1 via Supabase Auth. Anonymous searches allowed (no auth for `service_search`). Auth required for `home_profile` and `job_history`.
- **Rate limiting:** Cloudflare built-in — 60 req/min/user for `service_search`, 10 req/min for writes

#### Tool: `service_search`

```typescript
// Input schema
{
  name: "service_search",
  description: "Search for licensed home service providers. Use when a homeowner needs to find a plumber, HVAC tech, electrician, or other home service provider. Returns verified, ranked provider matches.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "The user's natural language request" },
      location: { type: "string", description: "City or zip code. Optional if user has a home profile." },
      urgency: { type: "string", enum: ["emergency", "soon", "planned"] },
      budget_max: { type: "number", description: "Maximum budget in USD" },
      category: { type: "string", enum: ["hvac", "plumbing", "electrical", "cleaning", "handyman", "roofing"] }
    },
    required: ["query"]
  }
}
// Note: All 6 categories accepted in schema for forward compatibility.
// Ring 1 data pipeline populates HVAC, Plumbing, and Electrical providers.
// Queries for cleaning/handyman/roofing return: "Coming soon to Miami — we
// currently cover HVAC, Plumbing, and Electrical. More trades launching soon."
// Always return exactly 3 results. If fewer than 3 match filters, relax
// filters (expand radius, include pending-license providers) before returning fewer.

```

**Flow:**
1. Receive tool call from AI host
2. Parse intent via Claude Sonnet (or keyword fallback if budget exhausted)
3. Geocode location (from profile or explicit)
4. Query providers table: filter by category + proximity (PostGIS ST_DWithin, 30mi radius) + active license
5. Score with heuristic ranker, return top 3
6. Log to `service_requests` + `matches` + `analytics_events`
7. Return JSON response + MCP App card references

**Output structure:**
```typescript
interface ServiceSearchResult {
  parsed_intent: {
    category: string;
    subcategory: string;
    urgency: "emergency" | "soon" | "planned";
    timing: string;
    budget_max: number | null;
    special_requirements: string | null;
  };
  providers: ProviderMatch[]; // max 3
  request_id: string;
}

interface ProviderMatch {
  provider_id: string;
  name: string;
  trade_category: string;
  license_status: "active" | "inactive" | "pending";
  license_number: string | null;
  avg_rating: number;
  review_count: number;
  price_range: { low: number; high: number } | null;
  response_time_estimate: string | null;
  distance_miles: number;
  contact_methods: { type: string; value: string }[];
  rank: number;
  score: number;
}
```

#### Tool: `provider_profile`

```typescript
{
  name: "provider_profile",
  description: "Get detailed information about a specific provider including license history, reviews, insurance status, and service area.",
  inputSchema: {
    type: "object",
    properties: {
      provider_id: { type: "string", description: "The provider's unique ID" }
    },
    required: ["provider_id"]
  }
}
```

Returns: full provider record with verification details, top 3 review excerpts, hours, photos, service area.

#### Tool: `home_profile`

```typescript
{
  name: "home_profile",
  description: "Get or update the homeowner's home profile. The profile stores property details that improve matching quality over time.",
  inputSchema: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["get", "update"] },
      fields: { type: "object", description: "Fields to update (only for action=update)" }
    },
    required: ["action"]
  }
}
```

Auth required. On `get`: returns current profile + completeness score + next suggested question. On `update`: patches JSONB, recalculates completeness, returns updated profile.

#### Tool: `job_history`

```typescript
{
  name: "job_history",
  description: "Get the homeowner's service history showing past searches, contacts, and bookings.",
  inputSchema: {
    type: "object",
    properties: {
      filter_trade: { type: "string", description: "Filter by trade category" },
      limit: { type: "number", description: "Max results (default 10)" }
    }
  }
}
```

Auth required. Returns array of past service records joined with provider info.

### 2.5 Intent Parser

**Primary: Claude Sonnet**

```typescript
const INTENT_SYSTEM_PROMPT = `You are a home services intent parser. Extract structured information from the user's request.

Return ONLY valid JSON with these fields:
{
  "category": "hvac"|"plumbing"|"electrical"|"cleaning"|"handyman"|"roofing",
  "subcategory": string (e.g., "repair", "maintenance", "installation", "inspection"),
  "urgency": "emergency"|"soon"|"planned",
  "timing": string (e.g., "today", "this_week", "next_week", "flexible"),
  "budget_max": number|null,
  "special_requirements": string|null,
  "multi_service": boolean
}

Rules:
- "emergency" = immediate safety/damage concern (leak, no heat/AC in extreme weather, electrical hazard)
- "soon" = needs attention this week but not dangerous
- "planned" = routine, flexible timing
- Extract budget as a number if mentioned, else null
- If multiple trades needed, set multi_service=true`;
```

**Fallback: Keyword parser** (used when LLM budget exhausted or API fails)

```typescript
// Category matching: check trade-specific keywords FIRST, then fall through to handyman.
// "fix my AC" matches HVAC (via "ac"), not handyman (via "fix").
const CATEGORY_KEYWORDS = {
  hvac: ["hvac", "a/c", "ac", "air condition", "heating", "furnace", "heat pump", "coolant", "thermostat"],
  plumbing: ["plumb", "pipe", "faucet", "toilet", "drain", "water heater", "sewer", "sprinkler"],
  electrical: ["electr", "outlet", "wiring", "panel", "circuit", "breaker", "light switch"],
  roofing: ["roof", "shingle", "gutter", "tile", "leak roof"],
  cleaning: ["clean", "maid", "janitorial", "pressure wash"],
  handyman: ["handyman", "odd job", "general repair"] // "fix" and "repair" removed — too generic
};
// Matching order: check hvac → plumbing → electrical → roofing → cleaning → handyman
// First match wins. "leak" is ambiguous — check context: "pipe leak" = plumbing, "roof leak" = roofing.
// If no category matches, default to null and let the LLM handle it.

const URGENCY_KEYWORDS = {
  emergency: ["emergency", "urgent", "burst", "flooding", "sparking", "no heat", "no ac", "dangerous"],
  soon: ["soon", "this week", "asap", "broken"],
  planned: ["maintenance", "tune-up", "inspection", "annual", "spring", "seasonal"]
};
```

**Validation:** Parsed intent must match Zod schema. If LLM returns invalid JSON, retry once. If still invalid, use keyword fallback.

**Cost control:**
- Check keyword parser first for clear-cut queries (single category keyword + urgency keyword → skip LLM)
- LLM only for ambiguous queries
- Hard budget cap: $500/mo on Anthropic API
- Rate limit: 60 searches/user/minute
- Daily spend alert at $20/day

### 2.6 Heuristic Ranking Engine

```typescript
interface RankingWeights {
  license_verified: number;  // 30 points max
  rating: number;            // 20 points max
  review_count: number;      // 15 points max
  proximity: number;         // 15 points max
  availability: number;      // 10 points max
  price_match: number;       // 10 points max
}

const DEFAULT_WEIGHTS: RankingWeights = {
  license_verified: 30,
  rating: 20,
  review_count: 15,
  proximity: 15,
  availability: 10,
  price_match: 10
};

function rankProvider(provider: Provider, intent: ParsedIntent): number {
  let score = 0;

  // License: 30 points if active
  if (provider.license_status === "active") score += 30;

  // Rating: up to 20 points (scaled 0-5 to 0-20)
  score += (provider.avg_rating / 5) * 20;

  // Review count: up to 15 points (log scale, caps at ~150 reviews)
  score += Math.min(Math.log10(provider.review_count + 1) * 5, 15);

  // Proximity: up to 15 points (1 point per mile closer, within 15mi)
  const dist = haversineDistance(provider.location_geo, intent.location_geo);
  score += Math.max(15 - dist, 0);

  // Availability: 10 points if available today
  // Ring 1 limitation: no real availability data — all providers assumed available.
  // This means the emergency boost (below) applies uniformly in Ring 1.
  // Ring 2 will add real availability signals from contact response data.
  const available = provider.available_today ?? true; // default true in Ring 1
  if (available) score += 10;

  // Price match: 10 points if within budget
  if (!intent.budget_max || (provider.price_range_low && provider.price_range_low <= intent.budget_max)) {
    score += 10;
  }

  // Emergency boost: 15 bonus points ONLY for available-now providers
  if (intent.urgency === "emergency") {
    score += available ? 15 : 0;
    // Re-sort: available-now providers always rank above unavailable
  }

  return score;
}
```

### 2.7 Provider Data Pipeline

#### Google Places (Weekly)

**Endpoint:** Nearby Search + Place Details
**Query:** All businesses with `type=plumber`, `type=hvac_contractor`, or `type=electrician` within 30 miles of Miami centroid (25.7617° N, 80.1918° W)
**Fields extracted:** name, address, phone, rating, review_count, hours, photos, place_id
**Cost:** ~$0.032/request. Budget: $200/mo. Estimated: ~4,000 requests/week for Miami HVAC + Plumbing.
**Caching:** Full refresh weekly. Results stored in `providers` table. `data_freshness_at` updated.

#### Yelp Fusion (Weekly)

**Endpoint:** Business Search + Business Reviews
**Query:** Categories `plumbing`, `hvacr`, and `electricians` in Miami metro
**Fields extracted:** rating, review_count, top 3 review excerpts, categories, photos
**Rate limit:** 5,000 calls/day free tier — more than sufficient
**Cost:** $0
**Dedup:** Match to existing providers using OR logic: (a) phone number exact match, OR (b) business name Jaro-Winkler similarity > 0.85 AND normalized address similarity > 0.80. Address normalization: expand abbreviations (St→Street, Ave→Avenue), strip suite/unit, lowercase. This handles "123 Main St" vs "123 Main Street" correctly.

#### Florida DBPR (Daily)

**Source:** MyFloridaLicense.com
**Scraping:** Apify actor, 2 req/sec self-limit
**Fields:** license_number, type (CAC/CFC/EC), status (active/inactive/expired/revoked), expiry date, disciplinary actions
**Matching:** Link to providers by business name fuzzy match + license number exact match
**Cost:** ~$50/mo Apify subscription
**Fallback:** If scraper fails, show "License verification pending" badge. Never block results due to verification failure.

#### Pipeline Architecture

```
Cloudflare Cron Trigger (weekly)
  → Worker: fetch-google-places
  → Worker: fetch-yelp
  → Supabase Edge Function: process-and-merge
    → Dedup by phone + address
    → Upsert into providers table
    → Update data_freshness_at

Cloudflare Cron Trigger (daily)
  → Worker: fetch-dbpr
  → Supabase Edge Function: process-verifications
    → Match to providers by name + license #
    → Upsert into provider_verifications
    → Update dbpr_last_checked

PostHog event on each run: source, records_processed, errors, duration
Alert if any source returns 0 records or >10% error rate
```

#### Google Places Query Strategy

Google Places Nearby Search returns max 60 results per query (20/page, 3 pages). To achieve 500+ provider coverage:
- **Query grid:** 15-mile radius from 12 center points across Miami-Dade + Broward counties (overlapping coverage)
- **Queries per point:** 3 (one each for `plumber`, `hvac_contractor`, `electrician`)
- **Total requests:** 12 centers × 3 trades × 3 pages = 108 requests per weekly refresh + Place Details for new providers
- **Expected yield:** 700–900 unique providers across 3 trade categories after dedup

#### Geocoding Strategy

User queries include location as text ("Miami", "33130", "Coral Gables"). This must be converted to coordinates for PostGIS spatial queries.

**Provider:** Google Geocoding API ($5 per 1,000 requests)
**Caching:** Cache zip code → lat/lng and city name → lat/lng mappings in a `geocode_cache` table in Supabase (TEXT key → GEOGRAPHY value). Miami metro has ~100 zip codes — cache fills quickly.
**Fallback:** If user has a home_profile with `location_geo`, use that. If no location provided and no profile, default to Miami centroid (25.7617, -80.1918).
**Cost:** Negligible after cache warms up. Estimated < $5/mo.

```sql
CREATE TABLE geocode_cache (
  location_key TEXT PRIMARY KEY, -- normalized: "miami fl", "33130", etc.
  location_geo GEOGRAPHY(POINT, 4326) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

> **Note on BBB data:** The PRD lists Better Business Bureau as a data source. Deferred to Ring 2 — BBB has limited API access and monthly refresh is too infrequent for Ring 1's daily verification needs.

### 2.8 MCP App UI Components

Five React components, built as standalone bundles on Cloudflare Pages. MCP server returns component reference + props.

#### ProviderMatchCard

**Default (collapsed) state:**
| Element | Content | Visual |
|---------|---------|--------|
| Provider Name | "CoolBreeze HVAC" | 16px bold |
| Trade Badge | Snowflake icon + "HVAC" | 12px muted pill |
| License Badge | "✅ Licensed — CAC1234567" | Green pill if verified; yellow warning if not |
| Star Rating | "4.8 ★ (127 reviews)" | 14px, gold star |
| Price Range | "$150–$400 for this service" | 14px muted |
| Response Time | "Typically responds in <15 min" | 12px green if <30min. Ring 1: null (no data source). Displays "Response time: Unknown" or hidden. Ring 2: computed from `contacts.provider_responded_at` after enough data. |
| CTA Button | "Contact Now" | Primary blue, full width |

**Expanded state (on tap):**
- Top 3 review excerpts with dates
- Insurance status badge
- Detailed license info (type, expiration, disciplinary)
- Business hours for today
- "Save Provider" heart icon

**Loading skeleton:** Rounded rectangles matching layout. 1.5s pulse animation. Max 5s before timeout.

**Error states:**
- License data unavailable: "ℹ️ License check pending" in gray. Card still functional.
- Provider data stale (>7 days): subtle "Last updated X days ago" note.

#### ServiceRequestSummary

Displays parsed intent as labeled, editable pills. Urgency banner: red (emergency), yellow (soon), green (planned).

Fields: Service Type, Location, Urgency, Budget, Timing, Special Requirements.

**Emergency behavior:** Card is SKIPPED for emergency urgency (go straight to results).

#### HomeProfileCard, JobHistoryTimeline, BookingConfirmation

Detailed in architecture doc. Built in Ring 1 as shells, fully wired in Ring 2.

### 2.9 Design System (MCP App Cards)

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-primary` | `#1B4F72` | Headers, primary buttons |
| `brand-secondary` | `#2E86C1` | Accent, links |
| `text-primary` | `#1C1C1C` | Body text, titles |
| `text-secondary` | `#5D6D7E` | Labels, captions |
| `text-muted` | `#ABB2B9` | Placeholders |
| `trust-verified` | `#27AE60` | Licensed badge, verified |
| `trust-premium` | `#D4AC0D` | Premium badge |
| `trust-unverified` | `#F39C12` | Warning, unverified |
| `urgency-emergency` | `#E74C3C` | Emergency banner |
| `urgency-soon` | `#F39C12` | Soon urgency |
| `urgency-planned` | `#27AE60` | Planned/flexible |
| `surface-card` | `#FFFFFF` | Card bg |
| `surface-bg` | `#F8F9FA` | Page bg |

**Typography:** System font stack for MCP cards (max compatibility). Inter for web apps.
**Spacing:** 4px base unit. Scale: 4/8/12/16/24/32/48/64.
**Icons:** Lucide Icons + custom trade badges (wrench, snowflake, lightning bolt).

### 2.10 CI/CD Pipeline

#### On Pull Request (GitHub Actions)
1. TypeScript type check (`tsc --noEmit`)
2. ESLint
3. Unit tests (Vitest)
4. MCP tool schema validation

#### On Merge to Main
1. All PR checks pass
2. Deploy MCP Server → `wrangler deploy`
3. Deploy MCP UI → Cloudflare Pages auto-deploy
4. Run Supabase migrations → `supabase db push`

**Target:** < 3 minutes from merge to live.

### 2.11 Security

- **Auth:** Supabase Auth (email + Google OAuth). JWTs, 1hr expiry, auto-refresh.
- **RLS:** All tables have row-level security. Homeowners see only their data. Providers see only their dashboard data. No cross-user data leaks.
- **PII & LLM:** Only the user's query text hits Claude for intent parsing. No email, phone, payment data, or full home profile sent to LLM.
- **Prompt injection:** Query sanitized (strip override attempts), limit 500 chars, system prompt instructs JSON-only output, output validated against Zod schema.
- **CCPA:** Data export via Edge Function. Soft-delete + 30-day hard-delete. Public provider data (Google/Yelp/DBPR) not subject to deletion.

### 2.12 Analytics Strategy

**MCP Server (Ring 1):** Server-side event logging only. The MCP server writes events directly to the `analytics_events` table on every tool call. Client-side PostHog scripts likely cannot run inside Claude's MCP App sandbox.

**Events logged:**
- `search_initiated` — user query, parsed intent, location
- `match_displayed` — provider IDs, ranks, scores
- `contact_initiated` — provider ID, contact method
- `search_no_results` — query that returned zero matches
- `intent_parse_fallback` — keyword parser used instead of LLM

**Web Apps (Ring 2+):** PostHog client-side SDK for funnel analytics, session recording, feature flags.

**Dashboards:** Ring 1 uses direct Supabase SQL queries or a simple admin Edge Function. PostHog dashboards added in Ring 2.

### 2.13 Error Handling

| Error | HTTP Status | User-Facing Message | Recovery |
|-------|------------|---------------------|----------|
| Supabase connection timeout | 503 | "Service temporarily unavailable. Try again." | Retry once with 2s delay |
| Claude API rate limit | 429 | (invisible — fallback to keyword parser) | Automatic keyword fallback |
| Claude API error | 502 | (invisible — fallback to keyword parser) | Automatic keyword fallback |
| No providers match filters | 200 | "No licensed [trade] providers found. Try expanding." | Suggest broader search |
| DBPR verification unavailable | 200 | Cards show "License check pending" badge | Partial results returned |
| Invalid tool input | 400 | "I couldn't understand that request. Could you rephrase?" | Return error to AI host |
| Unhandled exception | 500 | "Something went wrong. Please try again." | Log to analytics_events |

### 2.14 Cloudflare Worker Configuration

```toml
# wrangler.toml
name = "stoop-mcp-server"
main = "src/index.ts"
compatibility_date = "2026-03-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"

# Secrets (set via `wrangler secret put`):
# SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
# ANTHROPIC_API_KEY, POSTHOG_PROJECT_KEY

[triggers]
crons = [
  "0 6 * * 1",   # Weekly: Google Places refresh (Monday 6am UTC)
  "0 7 * * 1",   # Weekly: Yelp refresh (Monday 7am UTC)
  "0 5 * * *"    # Daily: DBPR license check (5am UTC)
]
```

> **Note on Supabase connection pooling:** Supabase Pro has a 60-connection limit. Cloudflare Workers make `await fetch()` calls to Supabase REST API — these are HTTP requests, not persistent DB connections. No connection pooling issue. If we later use the Supabase JS client in realtime mode, monitor connection count.

### 2.15 Cost Budget (Ring 1 Monthly)

> **LLM cost modeling:** If 80% of queries hit the keyword fallback (as designed), Claude API costs drop to ~$50–100/mo, not $200–500. The $200–500 range assumes worst case (all queries go to LLM). Monitor keyword fallback rate from Sprint 2.

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| Cloudflare Workers (Paid) | $5 | 10M requests/mo included |
| Cloudflare Pages | $0 | Free tier |
| Supabase Pro | $25 | 500MB DB, 5GB bandwidth |
| Claude Sonnet API | $200–500 | Intent parsing. Hard cap $500. |
| Google Places API | $100–200 | ~4,000 req/week |
| Yelp Fusion API | $0 | Free tier (5,000/day) |
| Apify (DBPR scraper) | $50 | Fixed monthly plan |
| PostHog | $0 | Free tier (1M events/mo) |
| **Total** | **$380–780/mo** | Within $100–600 target range |

### 2.16 Sprint Plan (Ring 1)

#### Sprint 1: Foundation (Weeks 1–2)

**Goals:** Monorepo scaffolding, database schema, MCP server skeleton, CI/CD pipeline.

**Deliverables:**
- Turborepo configured with `apps/mcp-server`, `apps/mcp-ui`, `packages/db`, `packages/matching`, `packages/shared`
- All Supabase tables created via migrations
- MCP server deployed to Cloudflare Workers — responds to `service_search` with hardcoded mock data
- RLS policies on all tables
- GitHub Actions: PR checks + deploy on merge
- PostGIS extension enabled, test spatial query

**Definition of done:** MCP server returns mock provider cards when invoked from Claude. All tables exist in Supabase. CI/CD pipeline deploys on merge.

#### Sprint 2: Intent Parser + Data Pipeline (Weeks 3–4)

**Goals:** LLM intent parsing with >90% accuracy, provider data seeded for Miami.

**Deliverables:**
- Intent parser (Claude Sonnet + keyword fallback) handling HVAC and plumbing queries
- 200-query test harness with accuracy tracking
- Google Places pipeline: fetch + store Miami HVAC/plumbing providers
- Yelp Fusion pipeline: fetch + merge with Google data
- DBPR scraper: daily license verification for all Miami providers
- Deduplication logic (phone + address matching)
- 700+ Miami HVAC/plumbing/electrical providers in database with license status

**Definition of done:** Intent parser passes >90% accuracy on 200-query test set. Database has 700+ Miami providers (HVAC + Plumbing + Electrical) with verified license status from DBPR (CAC, CFC, EC license types).

#### Sprint 3: Matching Engine + MCP App Cards v1 (Weeks 5–6)

**Goals:** End-to-end flow working. Real user can search and see results.

**Deliverables:**
- Heuristic ranking returns top 3 providers per search
- ProviderMatchCard renders in Claude (collapsed + expanded states)
- ServiceRequestSummary renders (skipped for emergencies)
- Contact flow: phone/SMS deep link on card CTA
- Server-side analytics events logged to `analytics_events` table
- Error states: no results, stale data, license pending
- Loading skeletons for all cards

**Definition of done:** A user types "I need a plumber in Miami" in Claude and sees 3 real, licensed providers as interactive cards with working Contact buttons. Analytics events visible via Supabase query.

> **Sprint 3 is the tightest sprint.** Wiring MCP App rendering, ranking with PostGIS, contact flow, error states, AND loading skeletons in 2 weeks is aggressive. If needed, defer loading skeletons and expanded card state to a 1-week buffer (Week 7) before starting Ring 2.

---

## 3. Open Questions for Review

All resolved (2026-03-24):

1. **MCP Apps rendering:** ✅ Build BOTH React cards AND text/markdown fallback from Sprint 1. React is primary; text fallback ensures the product works even if MCP App rendering is limited.

2. **Contact flow in Ring 1:** ✅ Pre-formatted SMS/call deep link with job details pre-filled (service type, urgency, parsed intent summary). Not just a phone number reveal.

3. **Auth timing:** ✅ Prompt for Supabase Auth sign-up after the first search. First search is anonymous; results include a "Sign up to save your preferences and service history" prompt. `home_profile` and `job_history` require auth.

4. **Trade scope:** ✅ Launch with HVAC + Plumbing + Electrical (3 base trades). Data pipeline queries all three from Google Places, Yelp, and DBPR (CAC, CFC, EC license types). Expected 700-900 providers across 3 trades.

5. **Web app hosting:** ✅ Vercel for all Next.js apps (Ring 2+3). Familiar pattern, better Next.js support, avoids Cloudflare Pages edge cases.

6. **Next.js version:** ✅ Use latest (Next.js 16) with App Router.

---

## 4. Risk Register (Ring 1)

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| MCP Apps rendering limitations | Medium | High | Text/markdown fallback; test early in Sprint 1 |
| DBPR scraper breaks (site changes) | High | Medium | "Verification pending" badge; manual monitoring |
| Claude API cost exceeds budget | Medium | Medium | Keyword fallback for 80% of queries; $500 hard cap; daily alerts |
| Provider data quality (wrong numbers, closed) | High | Medium | Multi-source cross-validation; user flagging in Ring 2 |
| Cloudflare Worker CPU limit (10ms) | Low | High | Intent parsing is async API call, not CPU-bound; ranking is simple math |
| Low search volume (< 500 by Week 6) | Medium | Critical | This is the kill signal. If it happens, stop before Ring 2. |
