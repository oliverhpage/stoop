import { detectCategory, detectUrgency } from "@stoop/shared";
import type { ProviderMatch, ParsedIntent, ServiceSearchResult } from "@stoop/shared";
import { renderSearchResultAsText } from "../lib/text-fallback";

const MOCK_PROVIDERS: ProviderMatch[] = [
  {
    provider_id: "prov_001",
    name: "CoolBreeze HVAC & Plumbing",
    trade_category: "hvac",
    license_status: "active",
    license_number: "CAC1234567",
    avg_rating: 4.8,
    review_count: 127,
    price_range: { low: 150, high: 400 },
    response_time_estimate: "Under 2 hours",
    distance_miles: 3.2,
    contact_methods: [
      { type: "phone", value: "305-555-0101" },
      { type: "email", value: "info@coolbreezehvac.com" },
    ],
    rank: 1,
    score: 0.95,
  },
  {
    provider_id: "prov_002",
    name: "RapidFlow Plumbing",
    trade_category: "plumbing",
    license_status: "active",
    license_number: "CFC7654321",
    avg_rating: 4.6,
    review_count: 89,
    price_range: { low: 100, high: 350 },
    response_time_estimate: "Same day",
    distance_miles: 5.1,
    contact_methods: [
      { type: "phone", value: "305-555-0202" },
    ],
    rank: 2,
    score: 0.88,
  },
  {
    provider_id: "prov_003",
    name: "Miami Pro Plumbing",
    trade_category: "plumbing",
    license_status: "active",
    license_number: "CFC9876543",
    avg_rating: 4.4,
    review_count: 54,
    price_range: null,
    response_time_estimate: "1-2 business days",
    distance_miles: 7.8,
    contact_methods: [
      { type: "phone", value: "305-555-0303" },
    ],
    rank: 3,
    score: 0.79,
  },
];

export function handleServiceSearch(
  input: Record<string, unknown>,
): ServiceSearchResult & { text_fallback: string } {
  const query = typeof input.query === "string" ? input.query : "";

  const category = detectCategory(query) ?? "plumbing";
  const urgency = detectUrgency(query) ?? "soon";

  const parsedIntent: ParsedIntent = {
    category,
    subcategory: "general",
    urgency,
    timing: urgency === "emergency" ? "immediate" : "this week",
    budget_max: null,
    special_requirements: null,
    multi_service: false,
  };

  const result: ServiceSearchResult = {
    parsed_intent: parsedIntent,
    providers: MOCK_PROVIDERS,
    request_id: `req_mock_${Date.now()}`,
  };

  const text_fallback = renderSearchResultAsText(result);

  return { ...result, text_fallback };
}
