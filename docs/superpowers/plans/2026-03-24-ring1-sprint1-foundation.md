# Ring 1 Sprint 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Turborepo monorepo, Supabase database (all 11 tables + RLS + PostGIS), MCP server skeleton on Cloudflare Workers returning mock data, and CI/CD pipeline — so that a user can invoke `service_search` from Claude and see mock provider cards.

**Architecture:** Turborepo monorepo with 3 apps (`mcp-server`, `mcp-ui`, `web`) and 3 packages (`db`, `matching`, `shared`). Cloudflare Worker serves MCP tools via Streamable HTTP. Supabase PostgreSQL stores all data with RLS. React 19 components for MCP App cards with text/markdown fallback.

**Tech Stack:** TypeScript, Turborepo, Cloudflare Workers + Wrangler, Supabase (PostgreSQL + PostGIS + Auth), React 19, Vitest, Zod, GitHub Actions

**Spec reference:** `docs/superpowers/specs/2026-03-24-stoop-build-plan-design.md`

---

## File Map

### New Files (Sprint 1)

```
stoop/
├── package.json                          # Root: workspaces, scripts, devDeps
├── turbo.json                            # Turborepo pipeline config
├── tsconfig.base.json                    # Shared TS config
├── .eslintrc.cjs                         # Root ESLint config
├── .gitignore
├── CLAUDE.md                             # Project guide for Claude Code
├── apps/
│   ├── mcp-server/
│   │   ├── package.json                  # Deps: @modelcontextprotocol/sdk, @supabase/supabase-js, zod
│   │   ├── tsconfig.json
│   │   ├── wrangler.toml                 # Worker config, cron triggers
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts                  # Worker entry: MCP handler + cron dispatch
│   │       ├── tools/
│   │       │   ├── service-search.ts     # service_search tool handler (mock → real in Sprint 2)
│   │       │   ├── provider-profile.ts   # provider_profile tool handler (stub)
│   │       │   ├── home-profile.ts       # home_profile tool handler (stub)
│   │       │   └── job-history.ts        # job_history tool handler (stub)
│   │       ├── lib/
│   │       │   ├── supabase.ts           # Supabase client factory for Workers
│   │       │   ├── analytics.ts          # Server-side event logging to analytics_events
│   │       │   └── text-fallback.ts      # Markdown fallback renderer for when MCP Apps unavailable
│   │       └── __tests__/
│   │           ├── service-search.test.ts
│   │           ├── text-fallback.test.ts
│   │           └── analytics.test.ts
│   └── mcp-ui/
│       ├── package.json                  # Deps: react, lucide-react
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── src/
│           ├── components/
│           │   ├── ProviderMatchCard.tsx  # Main card component (collapsed + expanded)
│           │   ├── ServiceRequestSummary.tsx
│           │   └── __tests__/
│           │       ├── ProviderMatchCard.test.tsx
│           │       └── ServiceRequestSummary.test.tsx
│           ├── shared/
│           │   ├── design-tokens.ts      # Color, spacing, typography tokens
│           │   └── TrustBadge.tsx         # Verified/Premium/Unverified badge
│           └── index.ts                  # Public exports
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types.ts                  # Provider, HomeProfile, ServiceRequest, PropertyData Zod schemas
│   │       ├── categories.ts             # Trade categories, keywords, license type mappings
│   │       ├── geo.ts                    # Haversine distance function
│   │       └── __tests__/
│   │           ├── types.test.ts
│   │           ├── categories.test.ts
│   │           └── geo.test.ts
│   ├── matching/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── intent-schema.ts          # Zod schema for parsed intent
│   │       ├── ranking.ts               # Heuristic scoring function
│   │       ├── constants.ts             # Weights, thresholds, config
│   │       └── __tests__/
│   │           ├── intent-schema.test.ts
│   │           └── ranking.test.ts
│   └── db/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── client.ts                 # Supabase client factory
│           └── types.ts                  # Generated types (placeholder until supabase gen)
├── supabase/
│   ├── config.toml                       # Supabase project config
│   └── migrations/
│       └── 001_initial_schema.sql        # All 11 tables + indexes + RLS
├── .github/
│   └── workflows/
│       ├── ci.yml                        # PR checks: tsc, eslint, vitest
│       └── deploy.yml                    # Merge to main: wrangler deploy + supabase push
└── .superpowers/                         # (gitignored) brainstorm artifacts
```

---

## Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json`, `turbo.json`, `tsconfig.base.json`, `.eslintrc.cjs`, `.gitignore`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`
- Create: `packages/matching/package.json`, `packages/matching/tsconfig.json`
- Create: `packages/db/package.json`, `packages/db/tsconfig.json`
- Create: `apps/mcp-server/package.json`, `apps/mcp-server/tsconfig.json`
- Create: `apps/mcp-ui/package.json`, `apps/mcp-ui/tsconfig.json`

- [ ] **Step 1: Initialize root package.json with workspaces**

```json
{
  "name": "stoop",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "test": "turbo test",
    "typecheck": "turbo typecheck"
  },
  "devDependencies": {
    "turbo": "^2",
    "typescript": "^5.7",
    "eslint": "^9",
    "@typescript-eslint/eslint-plugin": "^8",
    "@typescript-eslint/parser": "^8"
  }
}
```

- [ ] **Step 2: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

- [ ] **Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.turbo/
.wrangler/
.superpowers/
.DS_Store
.env
.env.local
*.log
```

- [ ] **Step 5: Create .eslintrc.cjs**

```javascript
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  env: { node: true, es2022: true },
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
  }
};
```

- [ ] **Step 6: Create packages/shared scaffold**

`packages/shared/package.json`:
```json
{
  "name": "@stoop/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint src/"
  },
  "devDependencies": {
    "vitest": "^3",
    "typescript": "^5.7"
  },
  "dependencies": {
    "zod": "^3.24"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 7: Create packages/matching scaffold** (same pattern as shared, deps on `@stoop/shared`)

- [ ] **Step 8: Create packages/db scaffold** (deps: `@supabase/supabase-js`)

- [ ] **Step 9: Create apps/mcp-server scaffold**

`apps/mcp-server/package.json`:
```json
{
  "name": "@stoop/mcp-server",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1",
    "@supabase/supabase-js": "^2",
    "@stoop/shared": "workspace:*",
    "@stoop/matching": "workspace:*",
    "@stoop/db": "workspace:*",
    "zod": "^3.24"
  },
  "devDependencies": {
    "wrangler": "^4",
    "vitest": "^3",
    "typescript": "^5.7",
    "@cloudflare/workers-types": "^4"
  }
}
```

- [ ] **Step 10: Create apps/mcp-ui scaffold** (React 19, Lucide icons, Vitest + @testing-library/react)

- [ ] **Step 11: Run `npm install` and verify workspace resolution**

Run: `cd ~/Documents/StoopMCP && npm install`
Expected: All workspaces resolved. No errors.

- [ ] **Step 12: Run `npx turbo typecheck` to verify all packages compile**

Run: `npx turbo typecheck`
Expected: All packages pass (may need empty index.ts files first)

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: scaffold Turborepo monorepo with 5 packages"
```

---

## Task 2: Shared Types & Utilities

**Files:**
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/categories.ts`
- Create: `packages/shared/src/geo.ts`
- Create: `packages/shared/src/index.ts`
- Test: `packages/shared/src/__tests__/types.test.ts`
- Test: `packages/shared/src/__tests__/categories.test.ts`
- Test: `packages/shared/src/__tests__/geo.test.ts`

- [ ] **Step 1: Write test for PropertyData schema validation**

```typescript
// packages/shared/src/__tests__/types.test.ts
import { describe, it, expect } from "vitest";
import { PropertyDataSchema, ParsedIntentSchema } from "../types";

describe("PropertyDataSchema", () => {
  it("validates a complete property", () => {
    const result = PropertyDataSchema.safeParse({
      type: "house",
      year_built: "before_1970",
      heating_system: "gas_furnace",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (new profile)", () => {
    const result = PropertyDataSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid property type", () => {
    const result = PropertyDataSchema.safeParse({ type: "castle" });
    expect(result.success).toBe(false);
  });
});

describe("ParsedIntentSchema", () => {
  it("validates a valid intent", () => {
    const result = ParsedIntentSchema.safeParse({
      category: "plumbing",
      subcategory: "repair",
      urgency: "emergency",
      timing: "today",
      budget_max: 500,
      special_requirements: null,
      multi_service: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = ParsedIntentSchema.safeParse({ category: "plumbing" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Documents/StoopMCP && npx turbo test --filter=@stoop/shared`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement types.ts with all Zod schemas**

```typescript
// packages/shared/src/types.ts
import { z } from "zod";

export const CATEGORIES = ["hvac", "plumbing", "electrical", "cleaning", "handyman", "roofing"] as const;
export type Category = (typeof CATEGORIES)[number];

export const URGENCIES = ["emergency", "soon", "planned"] as const;
export type Urgency = (typeof URGENCIES)[number];

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
  preferred_providers: z.array(z.string()).optional(),
});
export type PropertyData = z.infer<typeof PropertyDataSchema>;

export const ParsedIntentSchema = z.object({
  category: z.enum(CATEGORIES),
  subcategory: z.string(),
  urgency: z.enum(URGENCIES),
  timing: z.string(),
  budget_max: z.number().nullable(),
  special_requirements: z.string().nullable(),
  multi_service: z.boolean(),
});
export type ParsedIntent = z.infer<typeof ParsedIntentSchema>;

export interface ProviderMatch {
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

export interface ServiceSearchResult {
  parsed_intent: ParsedIntent;
  providers: ProviderMatch[];
  request_id: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx turbo test --filter=@stoop/shared`
Expected: PASS

- [ ] **Step 5: Write test for categories.ts**

```typescript
// packages/shared/src/__tests__/categories.test.ts
import { describe, it, expect } from "vitest";
import { detectCategory, LICENSE_TYPE_MAP } from "../categories";

describe("detectCategory", () => {
  it("detects HVAC from 'ac' keyword", () => {
    expect(detectCategory("my ac is broken")).toBe("hvac");
  });

  it("detects plumbing from 'faucet'", () => {
    expect(detectCategory("kitchen faucet dripping")).toBe("plumbing");
  });

  it("detects electrical from 'outlet'", () => {
    expect(detectCategory("outlet sparking")).toBe("electrical");
  });

  it("returns null for ambiguous query", () => {
    expect(detectCategory("something is wrong with my house")).toBeNull();
  });

  it("prioritizes trade keywords over generic 'fix'", () => {
    expect(detectCategory("fix my air conditioning")).toBe("hvac");
  });
});

describe("LICENSE_TYPE_MAP", () => {
  it("maps HVAC to CAC", () => {
    expect(LICENSE_TYPE_MAP.hvac).toBe("CAC");
  });
  it("maps plumbing to CFC", () => {
    expect(LICENSE_TYPE_MAP.plumbing).toBe("CFC");
  });
  it("maps electrical to EC", () => {
    expect(LICENSE_TYPE_MAP.electrical).toBe("EC");
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

- [ ] **Step 7: Implement categories.ts**

```typescript
// packages/shared/src/categories.ts
import type { Category } from "./types";

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  hvac: ["hvac", "a/c", "ac", "air condition", "heating", "furnace", "heat pump", "coolant", "thermostat"],
  plumbing: ["plumb", "pipe", "faucet", "toilet", "drain", "water heater", "sewer", "sprinkler"],
  electrical: ["electr", "outlet", "wiring", "panel", "circuit", "breaker", "light switch"],
  roofing: ["roof", "shingle", "gutter"],
  cleaning: ["clean", "maid", "janitorial", "pressure wash"],
  handyman: ["handyman", "odd job", "general repair"],
};

// Ordered: check specific trades first, handyman last
const MATCH_ORDER: Category[] = ["hvac", "plumbing", "electrical", "roofing", "cleaning", "handyman"];

export function detectCategory(query: string): Category | null {
  const lower = query.toLowerCase();
  for (const cat of MATCH_ORDER) {
    if (CATEGORY_KEYWORDS[cat].some((kw) => lower.includes(kw))) {
      return cat;
    }
  }
  return null;
}

export const URGENCY_KEYWORDS = {
  emergency: ["emergency", "urgent", "burst", "flooding", "sparking", "no heat", "no ac", "dangerous"],
  soon: ["soon", "this week", "asap", "broken"],
  planned: ["maintenance", "tune-up", "inspection", "annual", "spring", "seasonal"],
} as const;

export function detectUrgency(query: string): "emergency" | "soon" | "planned" | null {
  const lower = query.toLowerCase();
  for (const [urgency, keywords] of Object.entries(URGENCY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return urgency as "emergency" | "soon" | "planned";
    }
  }
  return null;
}

export const LICENSE_TYPE_MAP: Record<string, string> = {
  hvac: "CAC",
  plumbing: "CFC",
  electrical: "EC",
};

export const SUPPORTED_TRADES: Category[] = ["hvac", "plumbing", "electrical"];
```

- [ ] **Step 8: Run test to verify it passes**

- [ ] **Step 9: Write test for geo.ts (haversine distance)**

```typescript
// packages/shared/src/__tests__/geo.test.ts
import { describe, it, expect } from "vitest";
import { haversineDistance } from "../geo";

describe("haversineDistance", () => {
  it("returns 0 for same point", () => {
    expect(haversineDistance(25.7617, -80.1918, 25.7617, -80.1918)).toBeCloseTo(0, 1);
  });

  it("calculates Miami to Fort Lauderdale (~25 miles)", () => {
    const dist = haversineDistance(25.7617, -80.1918, 26.1224, -80.1373);
    expect(dist).toBeGreaterThan(20);
    expect(dist).toBeLessThan(30);
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

- [ ] **Step 11: Implement geo.ts**

```typescript
// packages/shared/src/geo.ts
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
```

- [ ] **Step 12: Run test to verify it passes**

- [ ] **Step 13: Create packages/shared/src/index.ts with public exports**

```typescript
export * from "./types";
export * from "./categories";
export * from "./geo";
```

- [ ] **Step 14: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared types, categories, and geo utilities with tests"
```

---

## Task 3: Matching Package (Intent Schema + Ranking)

**Files:**
- Create: `packages/matching/src/intent-schema.ts`
- Create: `packages/matching/src/ranking.ts`
- Create: `packages/matching/src/constants.ts`
- Create: `packages/matching/src/index.ts`
- Test: `packages/matching/src/__tests__/intent-schema.test.ts`
- Test: `packages/matching/src/__tests__/ranking.test.ts`

- [ ] **Step 1: Write test for intent schema validation**

```typescript
// packages/matching/src/__tests__/intent-schema.test.ts
import { describe, it, expect } from "vitest";
import { validateIntent } from "../intent-schema";

describe("validateIntent", () => {
  it("accepts valid LLM output", () => {
    const raw = JSON.stringify({
      category: "plumbing",
      subcategory: "repair",
      urgency: "emergency",
      timing: "today",
      budget_max: 500,
      special_requirements: null,
      multi_service: false,
    });
    const result = validateIntent(raw);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.category).toBe("plumbing");
  });

  it("rejects malformed JSON", () => {
    const result = validateIntent("not json at all");
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = validateIntent(JSON.stringify({
      category: "gardening", subcategory: "mow", urgency: "planned",
      timing: "flexible", budget_max: null, special_requirements: null, multi_service: false,
    }));
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement intent-schema.ts**

```typescript
// packages/matching/src/intent-schema.ts
import { ParsedIntentSchema, type ParsedIntent } from "@stoop/shared";

type ValidationResult =
  | { success: true; data: ParsedIntent }
  | { success: false; error: string };

export function validateIntent(raw: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { success: false, error: "Invalid JSON" };
  }

  const result = ParsedIntentSchema.safeParse(parsed);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.message };
}
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Write test for ranking function**

```typescript
// packages/matching/src/__tests__/ranking.test.ts
import { describe, it, expect } from "vitest";
import { rankProvider } from "../ranking";
import type { ParsedIntent } from "@stoop/shared";

const baseIntent: ParsedIntent = {
  category: "plumbing",
  subcategory: "repair",
  urgency: "planned",
  timing: "this_week",
  budget_max: 500,
  special_requirements: null,
  multi_service: false,
};

const baseProvider = {
  license_status: "active" as const,
  avg_rating: 4.5,
  review_count: 50,
  distance_miles: 5,
  price_range_low: 100,
  available_today: true,
};

describe("rankProvider", () => {
  it("gives max score to perfect provider", () => {
    const score = rankProvider(baseProvider, baseIntent);
    expect(score).toBeGreaterThan(80);
  });

  it("penalizes unverified license heavily", () => {
    const verified = rankProvider(baseProvider, baseIntent);
    const unverified = rankProvider({ ...baseProvider, license_status: "pending" as const }, baseIntent);
    expect(verified - unverified).toBeGreaterThanOrEqual(30);
  });

  it("boosts available providers in emergencies", () => {
    const emergencyIntent = { ...baseIntent, urgency: "emergency" as const };
    const score = rankProvider(baseProvider, emergencyIntent);
    const plannedScore = rankProvider(baseProvider, baseIntent);
    expect(score).toBeGreaterThan(plannedScore);
  });

  it("penalizes distance", () => {
    const close = rankProvider({ ...baseProvider, distance_miles: 1 }, baseIntent);
    const far = rankProvider({ ...baseProvider, distance_miles: 14 }, baseIntent);
    expect(close).toBeGreaterThan(far);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

- [ ] **Step 7: Implement constants.ts and ranking.ts**

`packages/matching/src/constants.ts`:
```typescript
export const DEFAULT_WEIGHTS = {
  license_verified: 30,
  rating: 20,
  review_count: 15,
  proximity: 15,
  availability: 10,
  price_match: 10,
} as const;
```

`packages/matching/src/ranking.ts`:
```typescript
import type { ParsedIntent } from "@stoop/shared";
import { DEFAULT_WEIGHTS } from "./constants";

interface RankableProvider {
  license_status: "active" | "inactive" | "pending" | "expired" | "revoked";
  avg_rating: number;
  review_count: number;
  distance_miles: number;
  price_range_low?: number | null;
  available_today?: boolean | null;
}

export function rankProvider(provider: RankableProvider, intent: ParsedIntent): number {
  let score = 0;

  if (provider.license_status === "active") score += DEFAULT_WEIGHTS.license_verified;

  score += (provider.avg_rating / 5) * DEFAULT_WEIGHTS.rating;

  score += Math.min(Math.log10(provider.review_count + 1) * 5, DEFAULT_WEIGHTS.review_count);

  score += Math.max(DEFAULT_WEIGHTS.proximity - provider.distance_miles, 0);

  const available = provider.available_today ?? true;
  if (available) score += DEFAULT_WEIGHTS.availability;

  if (!intent.budget_max || (provider.price_range_low != null && provider.price_range_low <= intent.budget_max)) {
    score += DEFAULT_WEIGHTS.price_match;
  }

  if (intent.urgency === "emergency") {
    score += available ? 15 : 0;
  }

  return score;
}
```

- [ ] **Step 8: Run test to verify it passes**

- [ ] **Step 9: Create index.ts and commit**

```bash
git add packages/matching/
git commit -m "feat: add matching package with intent validation and ranking"
```

---

## Task 4: Supabase Schema Migration

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create supabase/config.toml**

```toml
[project]
id = "" # Set after `supabase link`

[db]
port = 54322
shadow_port = 54320
major_version = 15

[studio]
enabled = true
port = 54323
```

- [ ] **Step 2: Write 001_initial_schema.sql with all 11 tables**

This file contains the full SQL from the spec — all 11 tables (users, home_profiles, providers, provider_verifications, service_requests, matches, contacts, analytics_events, bookings, reviews, provider_subscriptions), the geocode_cache table, all indexes, and all RLS policies. Copy the exact SQL from spec sections 2.3 through the RLS Policies section and the geocode_cache from 2.7.

The file should be ~200 lines of SQL. Start with:
```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 001: Initial schema for Stoop Ring 1
-- Creates all 11 tables + geocode_cache + indexes + RLS policies
```

Then all CREATE TABLE statements, then all CREATE INDEX statements, then all ALTER TABLE / CREATE POLICY statements, exactly as defined in the spec.

- [ ] **Step 3: Verify migration syntax**

Run: `cd ~/Documents/StoopMCP && npx supabase db lint --local` (if Supabase CLI is available) or manually review the SQL for syntax errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase migration with 11 tables, PostGIS, and RLS policies"
```

---

## Task 5: MCP Server Skeleton (Mock Data)

**Files:**
- Create: `apps/mcp-server/src/index.ts`
- Create: `apps/mcp-server/src/tools/service-search.ts`
- Create: `apps/mcp-server/src/tools/provider-profile.ts`
- Create: `apps/mcp-server/src/tools/home-profile.ts`
- Create: `apps/mcp-server/src/tools/job-history.ts`
- Create: `apps/mcp-server/src/lib/supabase.ts`
- Create: `apps/mcp-server/src/lib/analytics.ts`
- Create: `apps/mcp-server/src/lib/text-fallback.ts`
- Create: `apps/mcp-server/wrangler.toml`
- Create: `apps/mcp-server/vitest.config.ts`
- Test: `apps/mcp-server/src/__tests__/service-search.test.ts`
- Test: `apps/mcp-server/src/__tests__/text-fallback.test.ts`
- Test: `apps/mcp-server/src/__tests__/analytics.test.ts`

- [ ] **Step 1: Create wrangler.toml**

```toml
name = "stoop-mcp-server"
main = "src/index.ts"
compatibility_date = "2026-03-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "development"

[triggers]
crons = [
  "0 6 * * 1",
  "0 7 * * 1",
  "0 5 * * *"
]
```

- [ ] **Step 2: Write test for text-fallback renderer**

```typescript
// apps/mcp-server/src/__tests__/text-fallback.test.ts
import { describe, it, expect } from "vitest";
import { renderProviderAsText } from "../lib/text-fallback";
import type { ProviderMatch } from "@stoop/shared";

describe("renderProviderAsText", () => {
  it("renders a provider as markdown", () => {
    const provider: ProviderMatch = {
      provider_id: "abc-123",
      name: "CoolBreeze HVAC",
      trade_category: "hvac",
      license_status: "active",
      license_number: "CAC1234567",
      avg_rating: 4.8,
      review_count: 127,
      price_range: { low: 150, high: 400 },
      response_time_estimate: null,
      distance_miles: 3.2,
      contact_methods: [{ type: "phone", value: "305-555-1234" }],
      rank: 1,
      score: 92.5,
    };
    const text = renderProviderAsText(provider);
    expect(text).toContain("CoolBreeze HVAC");
    expect(text).toContain("✅ Licensed — CAC1234567");
    expect(text).toContain("4.8");
    expect(text).toContain("$150–$400");
    expect(text).toContain("305-555-1234");
  });

  it("shows warning for unverified license", () => {
    const provider: ProviderMatch = {
      provider_id: "def-456",
      name: "Joe's Plumbing",
      trade_category: "plumbing",
      license_status: "pending",
      license_number: null,
      avg_rating: 3.5,
      review_count: 12,
      price_range: null,
      response_time_estimate: null,
      distance_miles: 8,
      contact_methods: [{ type: "phone", value: "305-555-5678" }],
      rank: 3,
      score: 45.0,
    };
    const text = renderProviderAsText(provider);
    expect(text).toContain("⚠️ License check pending");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

- [ ] **Step 4: Implement text-fallback.ts**

```typescript
// apps/mcp-server/src/lib/text-fallback.ts
import type { ProviderMatch, ServiceSearchResult } from "@stoop/shared";

export function renderProviderAsText(p: ProviderMatch): string {
  const licenseLine = p.license_status === "active"
    ? `✅ Licensed — ${p.license_number}`
    : "⚠️ License check pending";

  const priceLine = p.price_range
    ? `$${p.price_range.low}–$${p.price_range.high}`
    : "Price: Contact for quote";

  const phone = p.contact_methods.find((c) => c.type === "phone")?.value;
  const contactLine = phone
    ? `📞 [Call: ${phone}](tel:${phone})`
    : "";

  return [
    `### ${p.rank}. ${p.name}`,
    licenseLine,
    `⭐ ${p.avg_rating} (${p.review_count} reviews) · ${priceLine}`,
    `📍 ${p.distance_miles.toFixed(1)} miles away`,
    contactLine,
    "",
  ].filter(Boolean).join("\n");
}

export function renderSearchResultAsText(result: ServiceSearchResult): string {
  const { parsed_intent: intent, providers } = result;
  const header = `## ${intent.category.toUpperCase()} ${intent.subcategory} — ${intent.urgency}\n`;
  const cards = providers.map(renderProviderAsText).join("\n---\n\n");
  return header + "\n" + cards;
}
```

- [ ] **Step 5: Run test to verify it passes**

- [ ] **Step 6: Write test for analytics logging**

```typescript
// apps/mcp-server/src/__tests__/analytics.test.ts
import { describe, it, expect, vi } from "vitest";
import { logEvent } from "../lib/analytics";

describe("logEvent", () => {
  it("formats event correctly for Supabase insert", () => {
    const event = logEvent("search_initiated", "user-123", { query: "plumber miami" });
    expect(event.event_type).toBe("search_initiated");
    expect(event.user_id).toBe("user-123");
    expect(event.properties.query).toBe("plumber miami");
  });

  it("allows null user_id for anonymous events", () => {
    const event = logEvent("search_initiated", null, { query: "plumber" });
    expect(event.user_id).toBeNull();
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

- [ ] **Step 8: Implement analytics.ts**

```typescript
// apps/mcp-server/src/lib/analytics.ts
interface AnalyticsEvent {
  event_type: string;
  user_id: string | null;
  properties: Record<string, unknown>;
}

export function logEvent(
  eventType: string,
  userId: string | null,
  properties: Record<string, unknown>
): AnalyticsEvent {
  return {
    event_type: eventType,
    user_id: userId,
    properties,
  };
}
```

- [ ] **Step 9: Run test to verify it passes**

- [ ] **Step 10: Write test for service-search mock handler**

```typescript
// apps/mcp-server/src/__tests__/service-search.test.ts
import { describe, it, expect } from "vitest";
import { handleServiceSearch } from "../tools/service-search";

describe("handleServiceSearch (mock mode)", () => {
  it("returns 3 mock providers for a plumbing query", async () => {
    const result = await handleServiceSearch({ query: "I need a plumber in Miami" });
    expect(result.providers).toHaveLength(3);
    expect(result.providers[0].rank).toBe(1);
    expect(result.providers[0].license_status).toBe("active");
  });

  it("includes parsed intent in response", async () => {
    const result = await handleServiceSearch({ query: "emergency HVAC repair" });
    expect(result.parsed_intent).toBeDefined();
    expect(result.parsed_intent.category).toBeDefined();
  });

  it("returns text fallback alongside structured data", async () => {
    const result = await handleServiceSearch({ query: "plumber miami" });
    expect(result.text_fallback).toBeDefined();
    expect(result.text_fallback).toContain("Licensed");
  });
});
```

- [ ] **Step 11: Run test to verify it fails**

- [ ] **Step 12: Implement service-search.ts with mock data**

```typescript
// apps/mcp-server/src/tools/service-search.ts
import type { ServiceSearchResult, ProviderMatch } from "@stoop/shared";
import { detectCategory, detectUrgency } from "@stoop/shared";
import { renderSearchResultAsText } from "../lib/text-fallback";

interface ServiceSearchInput {
  query: string;
  location?: string;
  urgency?: string;
  budget_max?: number;
  category?: string;
}

const MOCK_PROVIDERS: ProviderMatch[] = [
  {
    provider_id: "mock-1",
    name: "CoolBreeze HVAC & Plumbing",
    trade_category: "plumbing",
    license_status: "active",
    license_number: "CFC1234567",
    avg_rating: 4.8,
    review_count: 127,
    price_range: { low: 150, high: 400 },
    response_time_estimate: null,
    distance_miles: 3.2,
    contact_methods: [{ type: "phone", value: "305-555-0101" }],
    rank: 1,
    score: 92.5,
  },
  {
    provider_id: "mock-2",
    name: "RapidFlow Plumbing",
    trade_category: "plumbing",
    license_status: "active",
    license_number: "CFC7654321",
    avg_rating: 4.6,
    review_count: 89,
    price_range: { low: 120, high: 350 },
    response_time_estimate: null,
    distance_miles: 5.1,
    contact_methods: [{ type: "phone", value: "305-555-0202" }],
    rank: 2,
    score: 85.3,
  },
  {
    provider_id: "mock-3",
    name: "Miami Pro Plumbing",
    trade_category: "plumbing",
    license_status: "active",
    license_number: "CFC9999999",
    avg_rating: 4.3,
    review_count: 45,
    price_range: { low: 100, high: 300 },
    response_time_estimate: null,
    distance_miles: 7.8,
    contact_methods: [{ type: "phone", value: "305-555-0303" }],
    rank: 3,
    score: 78.1,
  },
];

export async function handleServiceSearch(
  input: ServiceSearchInput
): Promise<ServiceSearchResult & { text_fallback: string }> {
  const category = input.category ?? detectCategory(input.query) ?? "plumbing";
  const urgency = input.urgency ?? detectUrgency(input.query) ?? "planned";

  const parsed_intent = {
    category,
    subcategory: "repair",
    urgency: urgency as "emergency" | "soon" | "planned",
    timing: urgency === "emergency" ? "today" : "this_week",
    budget_max: input.budget_max ?? null,
    special_requirements: null,
    multi_service: false,
  };

  const result: ServiceSearchResult = {
    parsed_intent,
    providers: MOCK_PROVIDERS,
    request_id: `req_${Date.now()}`,
  };

  return {
    ...result,
    text_fallback: renderSearchResultAsText(result),
  };
}
```

- [ ] **Step 13: Run test to verify it passes**

- [ ] **Step 14: Implement stub tools (provider-profile, home-profile, job-history)**

Each returns a "Coming soon" message. These are wired in Sprint 2/3.

- [ ] **Step 15: Implement index.ts — Worker entry point with MCP handler**

This is the Cloudflare Worker that registers 4 MCP tools and routes tool calls to handlers. Use `@modelcontextprotocol/sdk` to set up Streamable HTTP transport. Reference the MCP TypeScript SDK docs for Cloudflare Worker integration.

```typescript
// apps/mcp-server/src/index.ts
// Worker entry: registers MCP tools, handles fetch events
// See: https://modelcontextprotocol.io/docs/guides/server
```

The implementation depends on the exact MCP SDK API for Cloudflare Workers. The key structure:
1. Create MCP server with tool definitions (4 tools from spec section 2.4)
2. Handle `fetch` event → route to MCP handler
3. Handle `scheduled` event → dispatch cron jobs (placeholder in Sprint 1)

- [ ] **Step 16: Run all tests**

Run: `npx turbo test`
Expected: All tests pass across all packages.

- [ ] **Step 17: Commit**

```bash
git add apps/mcp-server/
git commit -m "feat: add MCP server skeleton with mock data and text fallback"
```

---

## Task 6: MCP App UI Components (ProviderMatchCard + ServiceRequestSummary)

**Files:**
- Create: `apps/mcp-ui/src/shared/design-tokens.ts`
- Create: `apps/mcp-ui/src/shared/TrustBadge.tsx`
- Create: `apps/mcp-ui/src/components/ProviderMatchCard.tsx`
- Create: `apps/mcp-ui/src/components/ServiceRequestSummary.tsx`
- Create: `apps/mcp-ui/src/index.ts`
- Create: `apps/mcp-ui/vitest.config.ts`
- Test: `apps/mcp-ui/src/components/__tests__/ProviderMatchCard.test.tsx`
- Test: `apps/mcp-ui/src/components/__tests__/ServiceRequestSummary.test.tsx`

- [ ] **Step 1: Create design-tokens.ts**

```typescript
// apps/mcp-ui/src/shared/design-tokens.ts
export const colors = {
  brandPrimary: "#1B4F72",
  brandSecondary: "#2E86C1",
  textPrimary: "#1C1C1C",
  textSecondary: "#5D6D7E",
  textMuted: "#ABB2B9",
  trustVerified: "#27AE60",
  trustPremium: "#D4AC0D",
  trustUnverified: "#F39C12",
  urgencyEmergency: "#E74C3C",
  urgencySoon: "#F39C12",
  urgencyPlanned: "#27AE60",
  surfaceCard: "#FFFFFF",
  surfaceBg: "#F8F9FA",
  borderDefault: "#E5E7EB",
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32, xxl: 48,
} as const;
```

- [ ] **Step 2: Write test for ProviderMatchCard**

```typescript
// apps/mcp-ui/src/components/__tests__/ProviderMatchCard.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProviderMatchCard } from "../ProviderMatchCard";

const mockProvider = {
  provider_id: "test-1",
  name: "CoolBreeze HVAC",
  trade_category: "hvac",
  license_status: "active" as const,
  license_number: "CAC1234567",
  avg_rating: 4.8,
  review_count: 127,
  price_range: { low: 150, high: 400 },
  response_time_estimate: null,
  distance_miles: 3.2,
  contact_methods: [{ type: "phone", value: "305-555-1234" }],
  rank: 1,
  score: 92.5,
};

describe("ProviderMatchCard", () => {
  it("renders provider name", () => {
    render(<ProviderMatchCard provider={mockProvider} />);
    expect(screen.getByText("CoolBreeze HVAC")).toBeDefined();
  });

  it("shows verified license badge for active license", () => {
    render(<ProviderMatchCard provider={mockProvider} />);
    expect(screen.getByText(/Licensed/)).toBeDefined();
    expect(screen.getByText(/CAC1234567/)).toBeDefined();
  });

  it("shows contact button with phone deep link", () => {
    render(<ProviderMatchCard provider={mockProvider} />);
    const btn = screen.getByRole("link", { name: /Contact Now/i });
    expect(btn.getAttribute("href")).toContain("tel:");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

- [ ] **Step 4: Implement TrustBadge.tsx**

Small component that renders Verified (green), Premium (gold), or Pending (yellow) badge pill.

- [ ] **Step 5: Implement ProviderMatchCard.tsx**

React component matching the spec's collapsed state: provider name, trade badge, license badge, star rating, price range, contact button with `tel:` or `sms:` deep link. Uses design tokens for colors/spacing.

- [ ] **Step 6: Run test to verify it passes**

- [ ] **Step 7: Write test for ServiceRequestSummary**

Test that it renders parsed intent fields, shows urgency banner with correct color, and is hidden when urgency is "emergency".

- [ ] **Step 8: Implement ServiceRequestSummary.tsx**

Renders parsed intent as labeled pills with urgency banner. Returns null for emergency urgency (spec: "Card is SKIPPED for emergency urgency").

- [ ] **Step 9: Run test to verify it passes**

- [ ] **Step 10: Create index.ts exports and commit**

```bash
git add apps/mcp-ui/
git commit -m "feat: add ProviderMatchCard and ServiceRequestSummary components"
```

---

## Task 7: CI/CD Pipeline

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create ci.yml (PR checks)**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
      - run: npm ci
      - run: npx turbo typecheck
      - run: npx turbo lint
      - run: npx turbo test
```

- [ ] **Step 2: Create deploy.yml (merge to main)**

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
      - run: npm ci
      - run: npx turbo typecheck
      - run: npx turbo test

      - name: Deploy MCP Server
        working-directory: apps/mcp-server
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Run Supabase Migrations
        run: npx supabase db push --linked
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

- [ ] **Step 3: Commit**

```bash
git add .github/
git commit -m "feat: add CI/CD pipeline (PR checks + deploy on merge)"
```

---

## Task 8: CLAUDE.md + Final Verification

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write CLAUDE.md**

```markdown
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
- **Ring 1, Sprint 1** — Foundation complete. Mock data. No real provider data yet.
- **Next:** Sprint 2 — Intent parser (Claude Sonnet) + provider data pipeline.
```

- [ ] **Step 2: Run full test suite**

Run: `npx turbo test`
Expected: All tests pass.

- [ ] **Step 3: Run typecheck**

Run: `npx turbo typecheck`
Expected: No errors.

- [ ] **Step 4: Verify MCP server starts locally**

Run: `cd apps/mcp-server && npx wrangler dev`
Expected: Worker starts, accessible at localhost.

- [ ] **Step 5: Commit everything**

```bash
git add CLAUDE.md
git commit -m "feat: add CLAUDE.md project guide — Sprint 1 Foundation complete"
```

---

## Summary

| Task | What it builds | Tests |
|------|---------------|-------|
| 1 | Turborepo monorepo scaffold | Typecheck passes |
| 2 | Shared types, categories, geo utils | 8+ unit tests |
| 3 | Matching: intent validation + ranking | 7+ unit tests |
| 4 | Supabase schema (11 tables + RLS) | SQL syntax validation |
| 5 | MCP server skeleton with mock data + text fallback | 8+ unit tests |
| 6 | React MCP App cards (ProviderMatchCard + ServiceRequestSummary) | 6+ unit tests |
| 7 | CI/CD pipeline (GitHub Actions) | Pipeline config |
| 8 | CLAUDE.md + final verification | Full suite green |

**Total estimated tests:** ~30+
**Sprint 1 Definition of Done:** MCP server returns mock provider cards when invoked from Claude. All tables exist in Supabase. CI/CD pipeline deploys on merge to main.
