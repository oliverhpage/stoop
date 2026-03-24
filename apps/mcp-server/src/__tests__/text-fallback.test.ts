import { describe, it, expect } from "vitest";
import { renderProviderAsText, renderSearchResultAsText } from "../lib/text-fallback";
import type { ProviderMatch, ServiceSearchResult } from "@stoop/shared";

function makeProvider(overrides: Partial<ProviderMatch> = {}): ProviderMatch {
  return {
    provider_id: "prov_001",
    name: "CoolBreeze HVAC",
    trade_category: "hvac",
    license_status: "active",
    license_number: "CAC1234567",
    avg_rating: 4.8,
    review_count: 127,
    price_range: { low: 150, high: 400 },
    response_time_estimate: "Under 2 hours",
    distance_miles: 3.2,
    contact_methods: [{ type: "phone", value: "305-555-0101" }],
    rank: 1,
    score: 0.95,
    ...overrides,
  };
}

describe("renderProviderAsText", () => {
  it("renders verified license with license number", () => {
    const text = renderProviderAsText(makeProvider(), 1);
    expect(text).toContain("### 1. CoolBreeze HVAC");
    expect(text).toContain("✅ Licensed — CAC1234567");
  });

  it("shows pending warning for unverified license", () => {
    const text = renderProviderAsText(
      makeProvider({ license_status: "pending", license_number: null }),
      1,
    );
    expect(text).toContain("⚠️ License check pending");
    expect(text).not.toContain("✅");
  });

  it("includes phone deep link", () => {
    const text = renderProviderAsText(makeProvider(), 1);
    expect(text).toContain("[Call: 305-555-0101](tel:305-555-0101)");
  });

  it("shows 'Contact for quote' when no price range", () => {
    const text = renderProviderAsText(makeProvider({ price_range: null }), 1);
    expect(text).toContain("Contact for quote");
    expect(text).not.toContain("$");
  });

  it("renders price range when present", () => {
    const text = renderProviderAsText(makeProvider(), 1);
    expect(text).toContain("$150–$400");
  });

  it("renders rating and review count", () => {
    const text = renderProviderAsText(makeProvider(), 1);
    expect(text).toContain("⭐ 4.8 (127 reviews)");
  });

  it("renders distance", () => {
    const text = renderProviderAsText(makeProvider(), 1);
    expect(text).toContain("📍 3.2 miles away");
  });
});

describe("renderSearchResultAsText", () => {
  it("renders header with provider count", () => {
    const result: ServiceSearchResult = {
      parsed_intent: {
        category: "hvac",
        subcategory: "general",
        urgency: "soon",
        timing: "this week",
        budget_max: null,
        special_requirements: null,
        multi_service: false,
      },
      providers: [makeProvider()],
      request_id: "req_test",
    };
    const text = renderSearchResultAsText(result);
    expect(text).toContain("## Found 1 providers");
    expect(text).toContain("CoolBreeze HVAC");
  });
});
