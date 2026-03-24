# Ring 1 Sprint 3: MCP Integration + Contact Flow + Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the end-to-end user experience: a user types "I need a plumber in Miami" in Claude, sees 3 real licensed providers as interactive cards with working Contact buttons (SMS/call deep links with pre-filled job details), and the entire funnel is tracked. This is the Ring 1 exit deliverable.

**Architecture:** MCP server upgraded from basic fetch handler to proper MCP SDK integration (Streamable HTTP transport). UI components gain expanded state, loading skeletons, error handling, and contact deep links. Worker entry point becomes a full MCP server with tool definitions. Contact events tracked for funnel analysis.

**Tech Stack:** `@modelcontextprotocol/sdk` (MCP TypeScript SDK), React 19, Cloudflare Workers, Supabase Auth

**Spec reference:** `docs/superpowers/specs/2026-03-24-stoop-build-plan-design.md` — sections 2.4, 2.8, 2.9, 2.11, 2.12, 2.13, 2.16

**Sprint 2 baseline:** 148 tests passing, 21 test files, real `service_search` wired to PostGIS.

---

## File Map

### New Files

```
apps/mcp-server/src/
├── mcp/
│   ├── server.ts                 # MCP server setup with tool registration
│   └── tools.ts                  # Tool definitions (schemas + descriptions)
├── tools/
│   └── contact.ts                # Contact initiation handler (log + format deep link)
├── lib/
│   └── auth.ts                   # Supabase Auth helper (check token, prompt sign-up)
└── __tests__/
    ├── mcp-server.test.ts        # MCP tool registration tests
    ├── contact.test.ts
    └── auth.test.ts

apps/mcp-ui/src/
├── components/
│   ├── ProviderMatchCard.tsx      # (exists — add expanded state + contact deep link)
│   ├── ProviderCardSkeleton.tsx   # Loading skeleton
│   ├── ErrorState.tsx             # No results / stale data / error cards
│   ├── AuthPrompt.tsx             # Sign-up prompt after first search
│   └── ContactButton.tsx          # SMS/call deep link with pre-filled job details
│   └── __tests__/
│       ├── ProviderCardSkeleton.test.tsx
│       ├── ErrorState.test.tsx
│       ├── AuthPrompt.test.tsx
│       └── ContactButton.test.tsx
└── shared/
    └── trade-icons.tsx            # Wrench, snowflake, lightning bolt icons
```

### Modified Files

```
apps/mcp-server/src/index.ts              # Replace basic fetch with MCP SDK server
apps/mcp-server/src/tools/service-search.ts  # Return MCP-formatted response with card refs
apps/mcp-server/src/tools/provider-profile.ts  # Wire to real Supabase query
apps/mcp-server/wrangler.toml              # Add env var bindings for secrets
apps/mcp-ui/src/components/ProviderMatchCard.tsx  # Add expanded state + stale data note
apps/mcp-ui/src/components/ServiceRequestSummary.tsx  # (minor polish)
apps/mcp-ui/src/index.ts                   # Export new components
```

---

## Task 1: MCP SDK Server Integration

**Files:**
- Create: `apps/mcp-server/src/mcp/server.ts`
- Create: `apps/mcp-server/src/mcp/tools.ts`
- Modify: `apps/mcp-server/src/index.ts`
- Create: `apps/mcp-server/src/__tests__/mcp-server.test.ts`

Replace the basic POST-based fetch handler with a proper MCP server using `@modelcontextprotocol/sdk`.

- [ ] **Step 1: Write test for MCP tool registration**

```typescript
// apps/mcp-server/src/__tests__/mcp-server.test.ts
import { describe, it, expect } from "vitest";
import { TOOL_DEFINITIONS } from "../mcp/tools";

describe("MCP Tool Definitions", () => {
  it("defines 4 tools", () => {
    expect(TOOL_DEFINITIONS).toHaveLength(4);
  });

  it("service_search has required input schema", () => {
    const tool = TOOL_DEFINITIONS.find(t => t.name === "service_search");
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain("query");
  });

  it("provider_profile requires provider_id", () => {
    const tool = TOOL_DEFINITIONS.find(t => t.name === "provider_profile");
    expect(tool!.inputSchema.required).toContain("provider_id");
  });

  it("home_profile requires action", () => {
    const tool = TOOL_DEFINITIONS.find(t => t.name === "home_profile");
    expect(tool!.inputSchema.required).toContain("action");
  });

  it("all tools have descriptions", () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.description.length).toBeGreaterThan(20);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement tools.ts with all 4 MCP tool definitions**

```typescript
// apps/mcp-server/src/mcp/tools.ts
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "service_search",
    description: "Search for licensed home service providers. Use when a homeowner needs to find a plumber, HVAC tech, electrician, or other home service provider in Miami. Returns verified, ranked provider matches with contact information.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The user's natural language request" },
        location: { type: "string", description: "City, zip code, or neighborhood. Defaults to Miami." },
        urgency: { type: "string", enum: ["emergency", "soon", "planned"], description: "How urgent is the request" },
        budget_max: { type: "number", description: "Maximum budget in USD" },
        category: { type: "string", enum: ["hvac", "plumbing", "electrical", "cleaning", "handyman", "roofing"] },
      },
      required: ["query"],
    },
  },
  {
    name: "provider_profile",
    description: "Get detailed information about a specific provider including license history, reviews, insurance status, and service area.",
    inputSchema: {
      type: "object",
      properties: {
        provider_id: { type: "string", description: "The provider's unique ID from a search result" },
      },
      required: ["provider_id"],
    },
  },
  {
    name: "home_profile",
    description: "Get or update the homeowner's home profile. Stores property details that improve matching quality. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["get", "update"], description: "Whether to get or update the profile" },
        fields: { type: "object", description: "Fields to update (only for action=update)" },
      },
      required: ["action"],
    },
  },
  {
    name: "job_history",
    description: "Get the homeowner's service history showing past searches, contacts, and bookings. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        filter_trade: { type: "string", description: "Filter by trade category" },
        limit: { type: "number", description: "Max results (default 10)" },
      },
      required: [],
    },
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Implement server.ts — MCP server factory**

Create a function `createMcpServer(env)` that:
1. Creates an MCP server instance using `@modelcontextprotocol/sdk`
2. Registers all 4 tools with their schemas
3. Routes tool calls to the appropriate handler (`handleServiceSearch`, `handleProviderProfile`, etc.)
4. Returns the server instance

Consult the MCP TypeScript SDK docs for the correct API. The key pattern for Cloudflare Workers:
- Use `McpAgent` from `agents/mcp` or the `Server` class from `@modelcontextprotocol/sdk/server`
- Register tools via `server.setRequestHandler(ListToolsRequestSchema, ...)` and `server.setRequestHandler(CallToolRequestSchema, ...)`
- For Streamable HTTP transport on Workers, use the appropriate transport adapter

If the MCP SDK API for Cloudflare Workers is unclear, implement a clean adapter pattern:
```typescript
export function createMcpHandler(env: Env) {
  return async (request: Request): Promise<Response> => {
    // Parse MCP protocol messages
    // Route to tool handlers
    // Return MCP-formatted responses
  };
}
```

- [ ] **Step 6: Rewrite index.ts to use MCP server**

Replace the basic POST handler with the MCP server. Keep backward compatibility: if the request is a simple POST with `{tool, params}`, route to handlers directly. If it's an MCP protocol message, use the MCP server.

- [ ] **Step 7: Commit**

```bash
git add apps/mcp-server/src/mcp/ apps/mcp-server/src/__tests__/mcp-server.test.ts apps/mcp-server/src/index.ts
git commit -m "feat: integrate MCP SDK with proper tool registration and Streamable HTTP transport"
```

---

## Task 2: Contact Deep Links with Pre-Filled Job Details

**Files:**
- Create: `apps/mcp-ui/src/components/ContactButton.tsx`
- Create: `apps/mcp-ui/src/components/__tests__/ContactButton.test.tsx`
- Create: `apps/mcp-server/src/tools/contact.ts`
- Create: `apps/mcp-server/src/__tests__/contact.test.ts`
- Modify: `apps/mcp-ui/src/components/ProviderMatchCard.tsx`

- [ ] **Step 1: Write test for ContactButton component**

```typescript
// apps/mcp-ui/src/components/__tests__/ContactButton.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContactButton } from "../ContactButton";

describe("ContactButton", () => {
  const defaultProps = {
    phone: "305-555-1234",
    providerName: "CoolBreeze HVAC",
    serviceType: "HVAC repair",
    urgency: "soon" as const,
  };

  it("renders Call and Text buttons", () => {
    render(<ContactButton {...defaultProps} />);
    expect(screen.getByText(/Call/)).toBeDefined();
    expect(screen.getByText(/Text/)).toBeDefined();
  });

  it("generates tel: link for call button", () => {
    render(<ContactButton {...defaultProps} />);
    const callLink = screen.getByRole("link", { name: /Call/ });
    expect(callLink.getAttribute("href")).toBe("tel:305-555-1234");
  });

  it("generates sms: link with pre-filled body", () => {
    render(<ContactButton {...defaultProps} />);
    const smsLink = screen.getByRole("link", { name: /Text/ });
    const href = smsLink.getAttribute("href")!;
    expect(href).toContain("sms:305-555-1234");
    expect(href).toContain("body=");
    expect(decodeURIComponent(href)).toContain("HVAC repair");
    expect(decodeURIComponent(href)).toContain("CoolBreeze HVAC");
  });

  it("does not render when phone is null", () => {
    const { container } = render(<ContactButton {...defaultProps} phone={null} />);
    expect(container.innerHTML).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement ContactButton.tsx**

```tsx
// apps/mcp-ui/src/components/ContactButton.tsx
import React from "react";
import { colors } from "../shared/design-tokens";

interface ContactButtonProps {
  phone: string | null;
  providerName: string;
  serviceType: string;
  urgency: "emergency" | "soon" | "planned";
}

export function ContactButton({ phone, providerName, serviceType, urgency }: ContactButtonProps) {
  if (!phone) return null;

  const smsBody = encodeURIComponent(
    `Hi ${providerName}, I found you on Stoop. I'm looking for ${serviceType} (${urgency}). Are you available?`
  );

  const buttonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 16px",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 14,
    textDecoration: "none",
    cursor: "pointer",
    flex: 1,
  };

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
      <a
        href={`tel:${phone}`}
        style={{ ...buttonStyle, backgroundColor: colors.brandPrimary, color: "#fff" }}
        role="link"
      >
        📞 Call
      </a>
      <a
        href={`sms:${phone}?body=${smsBody}`}
        style={{ ...buttonStyle, backgroundColor: colors.surfaceBg, color: colors.brandPrimary, border: `1px solid ${colors.brandPrimary}` }}
        role="link"
      >
        💬 Text
      </a>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Write test for server-side contact handler**

```typescript
// apps/mcp-server/src/__tests__/contact.test.ts
import { describe, it, expect, vi } from "vitest";
import { handleContactInitiated } from "../tools/contact";

describe("handleContactInitiated", () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
  };

  it("logs contact event to contacts table", async () => {
    await handleContactInitiated({
      match_id: "match-123",
      user_id: null,
      contact_method: "sms",
    }, mockSupabase as any);

    expect(mockSupabase.from).toHaveBeenCalledWith("contacts");
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      match_id: "match-123",
      contact_method: "sms",
    }));
  });

  it("logs analytics event", async () => {
    await handleContactInitiated({
      match_id: "match-123",
      user_id: "user-456",
      contact_method: "phone",
    }, mockSupabase as any);

    // Should also write to analytics_events
    expect(mockSupabase.from).toHaveBeenCalledWith("analytics_events");
  });
});
```

- [ ] **Step 6: Implement contact.ts**

- [ ] **Step 7: Update ProviderMatchCard to use ContactButton**

Replace the existing `<a href="tel:">Contact Now</a>` with the new `ContactButton` component, passing provider name, service type, and urgency as props.

- [ ] **Step 8: Run all tests**

- [ ] **Step 9: Commit**

```bash
git add apps/mcp-ui/ apps/mcp-server/
git commit -m "feat: add contact deep links with pre-filled SMS and contact event logging"
```

---

## Task 3: ProviderMatchCard Expanded State

**Files:**
- Modify: `apps/mcp-ui/src/components/ProviderMatchCard.tsx`
- Modify: `apps/mcp-ui/src/components/__tests__/ProviderMatchCard.test.tsx`

- [ ] **Step 1: Write tests for expanded state**

```typescript
// Add to existing ProviderMatchCard.test.tsx
describe("expanded state", () => {
  it("shows expanded details when clicked", () => {
    render(<ProviderMatchCard provider={mockProvider} expanded={true} />);
    expect(screen.getByText(/License Type/)).toBeDefined();
    expect(screen.getByText(/Business Hours/)).toBeDefined();
  });

  it("shows stale data warning when data > 7 days old", () => {
    const staleProvider = {
      ...mockProvider,
      data_freshness_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    };
    render(<ProviderMatchCard provider={staleProvider} expanded={true} />);
    expect(screen.getByText(/Last updated/)).toBeDefined();
  });

  it("defaults to collapsed state", () => {
    render(<ProviderMatchCard provider={mockProvider} />);
    expect(screen.queryByText(/License Type/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Add expanded state to ProviderMatchCard**

Add an optional `expanded` prop. When true, show below the collapsed content:
- License details: type (CAC/CFC/EC), expiration date, any disciplinary actions
- Business hours for today (from `hours` field if available, else "Hours not available")
- Stale data note: if `data_freshness_at` > 7 days, show "Last updated X days ago" in muted text
- The card should still show the collapsed content at the top

Add `data_freshness_at?: string` and `license_type?: string` and `license_expiry?: string` and `hours_today?: string` to the provider prop interface (extend `ProviderMatch` or use a separate extended type).

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add apps/mcp-ui/
git commit -m "feat: add expanded state to ProviderMatchCard with stale data warnings"
```

---

## Task 4: Loading Skeletons

**Files:**
- Create: `apps/mcp-ui/src/components/ProviderCardSkeleton.tsx`
- Create: `apps/mcp-ui/src/components/__tests__/ProviderCardSkeleton.test.tsx`
- Modify: `apps/mcp-ui/src/index.ts`

- [ ] **Step 1: Write test for skeleton**

```typescript
// apps/mcp-ui/src/components/__tests__/ProviderCardSkeleton.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProviderCardSkeleton } from "../ProviderCardSkeleton";

describe("ProviderCardSkeleton", () => {
  it("renders 3 skeleton cards by default", () => {
    const { container } = render(<ProviderCardSkeleton />);
    const skeletons = container.querySelectorAll('[data-testid="skeleton-card"]');
    expect(skeletons.length).toBe(3);
  });

  it("renders custom count", () => {
    const { container } = render(<ProviderCardSkeleton count={2} />);
    const skeletons = container.querySelectorAll('[data-testid="skeleton-card"]');
    expect(skeletons.length).toBe(2);
  });

  it("has pulse animation class", () => {
    const { container } = render(<ProviderCardSkeleton count={1} />);
    const skeleton = container.querySelector('[data-testid="skeleton-card"]');
    expect(skeleton?.getAttribute("style")).toContain("animation");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement ProviderCardSkeleton**

Renders rounded rectangle placeholders matching the ProviderMatchCard layout:
- Name placeholder (wider bar)
- Trade badge placeholder (small pill)
- License badge placeholder (medium bar)
- Rating placeholder (short bar)
- Price placeholder (medium bar)
- Button placeholder (full width bar)
- 1.5s pulse animation (`@keyframes pulse` with opacity 0.4 → 1.0 → 0.4)

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add apps/mcp-ui/
git commit -m "feat: add ProviderCardSkeleton loading component"
```

---

## Task 5: Error State Components

**Files:**
- Create: `apps/mcp-ui/src/components/ErrorState.tsx`
- Create: `apps/mcp-ui/src/components/__tests__/ErrorState.test.tsx`
- Create: `apps/mcp-ui/src/components/AuthPrompt.tsx`
- Create: `apps/mcp-ui/src/components/__tests__/AuthPrompt.test.tsx`
- Modify: `apps/mcp-ui/src/index.ts`

- [ ] **Step 1: Write test for ErrorState**

```typescript
describe("ErrorState", () => {
  it("renders no-results message", () => {
    render(<ErrorState type="no_results" category="plumbing" />);
    expect(screen.getByText(/No licensed plumbing providers found/)).toBeDefined();
    expect(screen.getByText(/Try expanding/)).toBeDefined();
  });

  it("renders coming-soon for unsupported trade", () => {
    render(<ErrorState type="coming_soon" category="cleaning" />);
    expect(screen.getByText(/Coming soon/)).toBeDefined();
    expect(screen.getByText(/HVAC, Plumbing, and Electrical/)).toBeDefined();
  });

  it("renders generic error", () => {
    render(<ErrorState type="error" />);
    expect(screen.getByText(/Something went wrong/)).toBeDefined();
  });
});
```

- [ ] **Step 2: Write test for AuthPrompt**

```typescript
describe("AuthPrompt", () => {
  it("renders sign-up prompt after first search", () => {
    render(<AuthPrompt />);
    expect(screen.getByText(/Save your preferences/)).toBeDefined();
  });

  it("does not render when user is authenticated", () => {
    const { container } = render(<AuthPrompt isAuthenticated={true} />);
    expect(container.innerHTML).toBe("");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

- [ ] **Step 4: Implement ErrorState.tsx**

Three variants:
- `no_results`: "No licensed {category} providers found nearby. Try expanding your search area or adjusting your request."
- `coming_soon`: "Coming soon to Miami — we currently cover HVAC, Plumbing, and Electrical. More trades launching soon."
- `error`: "Something went wrong. Please try again."

Each with appropriate icon and styling.

- [ ] **Step 5: Implement AuthPrompt.tsx**

A card that appears after the first search result: "Sign up to save your preferences and service history." With a "Sign Up" button (links to Supabase Auth flow — placeholder URL for now).

- [ ] **Step 6: Run tests to verify they pass**

- [ ] **Step 7: Export all new components from index.ts**

- [ ] **Step 8: Commit**

```bash
git add apps/mcp-ui/
git commit -m "feat: add ErrorState and AuthPrompt components"
```

---

## Task 6: Provider Profile Tool (Wire to Real Data)

**Files:**
- Modify: `apps/mcp-server/src/tools/provider-profile.ts`
- Create: `apps/mcp-server/src/__tests__/provider-profile.test.ts`

- [ ] **Step 1: Write test for provider profile handler**

```typescript
describe("handleProviderProfile", () => {
  it("returns full provider details from Supabase", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: "p-123", name: "CoolBreeze HVAC", phone: "305-555-1234",
        address: "123 Main St, Miami",
        avg_rating: 4.8, review_count: 127,
        categories: ["hvac"], hours: { monday: "8am-6pm" },
        provider_verifications: [{
          license_number: "CAC1234567", license_type: "CAC",
          license_status: "active", license_expiry: "2027-06-15",
          disciplinary_actions: [],
        }],
      },
      error: null,
    });
    const result = await handleProviderProfile({ provider_id: "p-123" }, mockSupabase);
    expect(result.name).toBe("CoolBreeze HVAC");
    expect(result.license.status).toBe("active");
  });

  it("returns not-found for invalid provider_id", async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } });
    const result = await handleProviderProfile({ provider_id: "bad-id" }, mockSupabase);
    expect(result.error).toBe("Provider not found");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement provider-profile.ts**

Query Supabase for provider + joined provider_verifications. Return structured data including license details, hours, categories, contact info.

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add apps/mcp-server/
git commit -m "feat: wire provider_profile tool to real Supabase data"
```

---

## Task 7: Trade Icons + UI Polish

**Files:**
- Create: `apps/mcp-ui/src/shared/trade-icons.tsx`
- Modify: `apps/mcp-ui/src/components/ProviderMatchCard.tsx` (add trade icon)
- Modify: `apps/mcp-ui/src/index.ts`

- [ ] **Step 1: Create trade-icons.tsx**

Simple SVG icon components for each trade:
- HVAC: snowflake icon (from Lucide or inline SVG)
- Plumbing: wrench icon
- Electrical: lightning bolt icon
- Default: tool icon

```tsx
export function TradeIcon({ trade }: { trade: string }) {
  // Return appropriate icon based on trade
}
```

- [ ] **Step 2: Add trade icon to ProviderMatchCard**

Place next to the trade badge pill.

- [ ] **Step 3: Commit**

```bash
git add apps/mcp-ui/
git commit -m "feat: add trade icons and UI polish to ProviderMatchCard"
```

---

## Task 8: Wrangler Environment Config + CLAUDE.md Update

**Files:**
- Modify: `apps/mcp-server/wrangler.toml`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update wrangler.toml with all required env bindings**

```toml
name = "stoop-mcp-server"
main = "src/index.ts"
compatibility_date = "2026-03-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"

# Secrets (set via `wrangler secret put`):
# SUPABASE_URL
# SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
# ANTHROPIC_API_KEY
# GOOGLE_GEOCODING_API_KEY
# GOOGLE_PLACES_API_KEY
# YELP_API_KEY

[triggers]
crons = [
  "0 6 * * 1",
  "0 7 * * 1",
  "0 5 * * *"
]
```

- [ ] **Step 2: Update CLAUDE.md**

Update current state to reflect Sprint 3 completion. Add deployment instructions section:

```markdown
## Deployment
1. Create Supabase project, run migrations: `npx supabase db push --linked`
2. Set Cloudflare secrets: `wrangler secret put SUPABASE_URL` (etc.)
3. Deploy: `cd apps/mcp-server && npx wrangler deploy`
4. Seed data: `npx tsx scripts/seed-miami.ts`
5. Test: invoke `service_search` from Claude with Stoop MCP server URL
```

- [ ] **Step 3: Run full test suite one final time**

Run: `npx turbo test && npx turbo typecheck`
Expected: All tests pass, all packages typecheck.

- [ ] **Step 4: Commit**

```bash
git add apps/mcp-server/wrangler.toml CLAUDE.md
git commit -m "feat: Ring 1 complete — update config and docs for deployment"
```

---

## Summary

| Task | What it builds | Tests |
|------|---------------|-------|
| 1 | MCP SDK integration (Streamable HTTP, 4 registered tools) | 5+ |
| 2 | Contact deep links (SMS/call with pre-filled job details) + event logging | 6+ |
| 3 | ProviderMatchCard expanded state + stale data warnings | 3+ |
| 4 | Loading skeletons | 3+ |
| 5 | Error states (no results, coming soon, generic) + auth prompt | 5+ |
| 6 | Provider profile tool wired to real data | 2+ |
| 7 | Trade icons + UI polish | — |
| 8 | Wrangler config + CLAUDE.md + final verification | Full suite |

**Total estimated new tests:** ~25+
**Sprint 3 Definition of Done:** A user types "I need a plumber in Miami" in Claude and sees 3 real, licensed providers as interactive cards with working Contact buttons (SMS/call deep links). Analytics events visible via Supabase query. All error states handled gracefully.
