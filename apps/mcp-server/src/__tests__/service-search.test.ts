import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleServiceSearch } from "../tools/service-search";
import type { Env, SupabaseClient } from "../tools/service-search";

// --- Mock data ---

const MOCK_DB_PROVIDERS = [
  {
    id: "uuid-001",
    name: "CoolBreeze HVAC",
    phone: "305-555-0101",
    address: "123 Main St, Miami",
    categories: ["hvac"],
    avg_rating: 4.8,
    review_count: 127,
    price_range_low: 150,
    price_range_high: 400,
    distance_meters: 5150, // ~3.2 miles
    license_status: "active",
    license_number: "CAC1234567",
    license_type: "CAC",
  },
  {
    id: "uuid-002",
    name: "QuickCool AC",
    phone: "305-555-0202",
    address: "456 Oak Ave, Miami",
    categories: ["hvac"],
    avg_rating: 4.5,
    review_count: 89,
    price_range_low: 100,
    price_range_high: 350,
    distance_meters: 8200, // ~5.1 miles
    license_status: "active",
    license_number: "CAC7654321",
    license_type: "CAC",
  },
  {
    id: "uuid-003",
    name: "Budget Air Services",
    phone: null,
    address: "789 Pine Rd, Miami",
    categories: ["hvac"],
    avg_rating: 4.0,
    review_count: 30,
    price_range_low: null,
    price_range_high: null,
    distance_meters: 12500, // ~7.8 miles
    license_status: "pending",
    license_number: null,
    license_type: null,
  },
  {
    id: "uuid-004",
    name: "Extra HVAC Corp",
    phone: "305-555-0404",
    address: "999 Elm St, Miami",
    categories: ["hvac"],
    avg_rating: 3.8,
    review_count: 10,
    price_range_low: 200,
    price_range_high: 500,
    distance_meters: 20000,
    license_status: "inactive",
    license_number: "CAC0000000",
    license_type: "CAC",
  },
];

// --- Helpers ---

const MOCK_ENV: Env = {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_ANON_KEY: "test-key",
  ANTHROPIC_API_KEY: "test-anthropic-key",
  GOOGLE_GEOCODING_API_KEY: "test-google-key",
};

function createMockSupabase(overrides?: {
  rpcData?: unknown[] | null;
  rpcError?: unknown;
  insertReqData?: { id: string } | null;
}) {
  const insertedAnalytics: Record<string, unknown>[] = [];
  const insertedMatches: Record<string, unknown>[] = [];
  const insertedServiceRequests: Record<string, unknown>[] = [];

  const mockFrom = vi.fn((table: string) => {
    const insertFn = vi.fn((row: any) => {
      if (table === "analytics_events") {
        insertedAnalytics.push(row);
        return Promise.resolve({});
      }
      if (table === "service_requests") {
        insertedServiceRequests.push(row);
        return {
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: overrides?.insertReqData ?? { id: "req-db-001" },
                error: null,
              }),
            ),
          })),
          then: (resolve: any) =>
            resolve({
              data: overrides?.insertReqData ?? { id: "req-db-001" },
              error: null,
            }),
        };
      }
      if (table === "matches") {
        if (Array.isArray(row)) {
          insertedMatches.push(...row);
        } else {
          insertedMatches.push(row);
        }
        return Promise.resolve({});
      }
      if (table === "geocode_cache") {
        return { catch: () => {} };
      }
      return Promise.resolve({});
    });

    return {
      insert: insertFn,
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: "not found" })),
        })),
      })),
    };
  });

  const mockRpc = vi.fn(() =>
    Promise.resolve({
      data: overrides?.rpcData !== undefined ? overrides.rpcData : MOCK_DB_PROVIDERS,
      error: overrides?.rpcError ?? null,
    }),
  );

  const supabase = {
    rpc: mockRpc,
    from: mockFrom,
  } as unknown as SupabaseClient;

  return {
    supabase,
    mockRpc,
    mockFrom,
    insertedAnalytics,
    insertedMatches,
    insertedServiceRequests,
  };
}

function noopLlm(): Promise<string> {
  throw new Error("LLM should not be called for keyword-resolvable queries");
}

// --- Tests ---

describe("handleServiceSearch", () => {
  it("returns top 3 ranked providers from PostGIS data", async () => {
    const { supabase } = createMockSupabase();
    const result = await handleServiceSearch(
      { query: "ac repair in Miami" },
      MOCK_ENV,
      supabase,
      noopLlm,
    );

    expect(result.providers).toHaveLength(3);
    expect(result.providers[0].rank).toBe(1);
    expect(result.providers[1].rank).toBe(2);
    expect(result.providers[2].rank).toBe(3);

    // Best-rated active licensed provider should rank first
    expect(result.providers[0].name).toBe("CoolBreeze HVAC");
    expect(result.providers[0].license_status).toBe("active");
  });

  it("includes parsed_intent with category detected by keywords", async () => {
    const { supabase } = createMockSupabase();
    const result = await handleServiceSearch(
      { query: "ac repair" },
      MOCK_ENV,
      supabase,
      noopLlm,
    );

    expect(result.parsed_intent).toBeDefined();
    expect(result.parsed_intent.category).toBe("hvac");
  });

  it("returns coming-soon for unsupported trades", async () => {
    const { supabase, mockRpc } = createMockSupabase();
    const mockLlm = vi.fn().mockResolvedValue(
      JSON.stringify({
        category: "cleaning",
        subcategory: "deep clean",
        urgency: "planned",
        timing: "next week",
        budget_max: null,
        special_requirements: null,
        multi_service: false,
      }),
    );

    const result = await handleServiceSearch(
      { query: "I need a house cleaner" },
      MOCK_ENV,
      supabase,
      mockLlm,
    );

    expect(result.providers).toHaveLength(0);
    expect(result.text_fallback).toContain("Coming Soon");
    // Should NOT call the RPC since category is unsupported
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns no-results when supabase returns empty", async () => {
    const { supabase } = createMockSupabase({ rpcData: [] });
    const result = await handleServiceSearch(
      { query: "plumber near me" },
      MOCK_ENV,
      supabase,
      noopLlm,
    );

    expect(result.providers).toHaveLength(0);
    expect(result.text_fallback).toContain("No providers found");
  });

  it("returns no-results when supabase returns null (error)", async () => {
    const { supabase } = createMockSupabase({ rpcData: null, rpcError: "db error" });
    const result = await handleServiceSearch(
      { query: "electrician" },
      MOCK_ENV,
      supabase,
      noopLlm,
    );

    expect(result.providers).toHaveLength(0);
    expect(result.text_fallback).toContain("No providers found");
  });

  it("logs search_initiated and match_displayed analytics events", async () => {
    const { supabase, insertedAnalytics } = createMockSupabase();
    await handleServiceSearch(
      { query: "ac repair in Miami" },
      MOCK_ENV,
      supabase,
      noopLlm,
    );

    const eventTypes = insertedAnalytics.map((e) => e.event_type);
    expect(eventTypes).toContain("search_initiated");
    expect(eventTypes).toContain("match_displayed");

    const searchEvent = insertedAnalytics.find((e) => e.event_type === "search_initiated");
    expect((searchEvent?.properties as any).query).toBe("ac repair in Miami");

    const matchEvent = insertedAnalytics.find((e) => e.event_type === "match_displayed");
    expect((matchEvent?.properties as any).provider_ids).toHaveLength(3);
  });

  it("logs search_no_results analytics when no providers found", async () => {
    const { supabase, insertedAnalytics } = createMockSupabase({ rpcData: [] });
    await handleServiceSearch(
      { query: "plumber near me" },
      MOCK_ENV,
      supabase,
      noopLlm,
    );

    const eventTypes = insertedAnalytics.map((e) => e.event_type);
    expect(eventTypes).toContain("search_no_results");
  });

  it("logs to service_requests and matches tables", async () => {
    const { supabase, insertedServiceRequests, insertedMatches } = createMockSupabase();
    await handleServiceSearch(
      { query: "ac repair in Miami" },
      MOCK_ENV,
      supabase,
      noopLlm,
    );

    expect(insertedServiceRequests).toHaveLength(1);
    expect(insertedServiceRequests[0].raw_query).toBe("ac repair in Miami");
    expect(insertedServiceRequests[0].category).toBe("hvac");

    expect(insertedMatches).toHaveLength(3);
    expect(insertedMatches[0].service_request_id).toBe("req-db-001");
    expect(insertedMatches[0].rank).toBe(1);
  });

  it("uses keyword parser for clear queries — LLM not called", async () => {
    const mockLlm = vi.fn().mockRejectedValue(new Error("should not be called"));
    const { supabase } = createMockSupabase();

    // "ac repair" has keyword match for hvac — should not call LLM
    const result = await handleServiceSearch(
      { query: "ac repair" },
      MOCK_ENV,
      supabase,
      mockLlm,
    );

    expect(mockLlm).not.toHaveBeenCalled();
    expect(result.parsed_intent.category).toBe("hvac");
  });

  it("includes text_fallback with Licensed text", async () => {
    const { supabase } = createMockSupabase();
    const result = await handleServiceSearch(
      { query: "ac repair" },
      MOCK_ENV,
      supabase,
      noopLlm,
    );

    expect(result.text_fallback).toContain("Licensed");
    expect(result.text_fallback).toContain("Found 3 providers");
  });

  it("includes request_id starting with req_", async () => {
    const { supabase } = createMockSupabase();
    const result = await handleServiceSearch(
      { query: "ac repair" },
      MOCK_ENV,
      supabase,
      noopLlm,
    );

    expect(result.request_id).toMatch(/^req_\d+$/);
  });

  it("calls PostGIS RPC with correct parameters", async () => {
    const { supabase, mockRpc } = createMockSupabase();
    await handleServiceSearch(
      { query: "ac repair", location: "Coral Gables, FL" },
      MOCK_ENV,
      supabase,
      noopLlm,
    );

    expect(mockRpc).toHaveBeenCalledWith("find_nearby_providers", {
      search_lat: expect.any(Number),
      search_lng: expect.any(Number),
      radius_meters: expect.any(Number),
      trade_category: "hvac",
    });

    // Radius should be ~30 miles in meters
    const callArgs = mockRpc.mock.calls[0][1] as Record<string, unknown>;
    expect(callArgs.radius_meters).toBeCloseTo(30 * 1609.34, 0);
  });

  it("overrides intent fields from explicit input params", async () => {
    const { supabase } = createMockSupabase();
    const result = await handleServiceSearch(
      { query: "ac repair", urgency: "emergency", budget_max: 500, category: "plumbing" },
      MOCK_ENV,
      supabase,
      noopLlm,
    );

    expect(result.parsed_intent.urgency).toBe("emergency");
    expect(result.parsed_intent.budget_max).toBe(500);
    expect(result.parsed_intent.category).toBe("plumbing");
  });

  it("handles providers with null phone — contact_methods is empty", async () => {
    const { supabase } = createMockSupabase();
    const result = await handleServiceSearch(
      { query: "ac repair" },
      MOCK_ENV,
      supabase,
      noopLlm,
    );

    // Budget Air Services has null phone
    const noPhoneProvider = result.providers.find((p) => p.name === "Budget Air Services");
    if (noPhoneProvider) {
      expect(noPhoneProvider.contact_methods).toHaveLength(0);
    }
  });

  it("computes distance_miles from distance_meters", async () => {
    const { supabase } = createMockSupabase();
    const result = await handleServiceSearch(
      { query: "ac repair" },
      MOCK_ENV,
      supabase,
      noopLlm,
    );

    // CoolBreeze has distance_meters=5150, so ~3.2 miles
    expect(result.providers[0].distance_miles).toBeCloseTo(5150 / 1609.34, 1);
  });
});
