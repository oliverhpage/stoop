import { parseIntent } from "@stoop/matching";
import { rankProvider } from "@stoop/matching";
import { SUPPORTED_TRADES } from "@stoop/shared";
import type { ServiceSearchResult, ProviderMatch, ParsedIntent, Category } from "@stoop/shared";
import { geocode } from "../lib/geocoding";
import type { GeocodeFetch } from "../lib/geocoding";
import { renderSearchResultAsText } from "../lib/text-fallback";
import { writeEvent } from "../lib/analytics";

export interface ServiceSearchInput {
  query: string;
  location?: string;
  urgency?: string;
  budget_max?: number;
  category?: string;
}

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ANTHROPIC_API_KEY: string;
  GOOGLE_GEOCODING_API_KEY: string;
}

// Supabase client interface — kept minimal for testability
export interface SupabaseClient {
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown[] | null; error: unknown }>;
  from: (table: string) => {
    insert: (row: Record<string, unknown> | Record<string, unknown>[]) => {
      select: (columns: string) => {
        single: () => Promise<{ data: { id: string } | null; error: unknown }>;
      };
    } & Promise<unknown>;
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        single: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
      };
    };
  };
}

const RADIUS_MILES = 30;
const METERS_PER_MILE = 1609.34;
const MAX_RESULTS = 3;

/**
 * Map parsed category to the value stored in the providers.categories array.
 * Currently 1:1 but this indirection lets us change DB values without touching the parser.
 */
function mapCategoryToDbValue(category: string): string {
  return category;
}

function createGeocodeFetcher(apiKey: string): GeocodeFetch {
  return async (query: string) => {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
    const res = await fetch(url);
    return res.json() as Promise<{
      results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
      status: string;
    }>;
  };
}

function comingSoonResponse(parsedIntent: ParsedIntent): ServiceSearchResult & { text_fallback: string } {
  const result: ServiceSearchResult = {
    parsed_intent: parsedIntent,
    providers: [],
    request_id: `req_${Date.now()}`,
  };
  const text_fallback = `## ${parsedIntent.category} — Coming Soon\n\nWe're expanding to cover ${parsedIntent.category} services in Miami soon. Currently we support HVAC, plumbing, and electrical.`;
  return { ...result, text_fallback };
}

function noResultsResponse(parsedIntent: ParsedIntent): ServiceSearchResult & { text_fallback: string } {
  const result: ServiceSearchResult = {
    parsed_intent: parsedIntent,
    providers: [],
    request_id: `req_${Date.now()}`,
  };
  const text_fallback = `## No providers found\n\nWe couldn't find ${parsedIntent.category} providers in your area right now. Try expanding your search area or check back soon.`;
  return { ...result, text_fallback };
}

export async function handleServiceSearch(
  input: ServiceSearchInput,
  env: Env,
  supabase: SupabaseClient,
  callLlm: (query: string) => Promise<string>,
): Promise<ServiceSearchResult & { text_fallback: string }> {
  // 1. Parse intent
  const { parsed_intent, source } = await parseIntent(input.query, { callLlm });

  // Override with explicit params if provided
  if (input.urgency) parsed_intent.urgency = input.urgency as ParsedIntent["urgency"];
  if (input.budget_max) parsed_intent.budget_max = input.budget_max;
  if (input.category) parsed_intent.category = input.category as Category;

  // 2. Check supported trades
  if (!SUPPORTED_TRADES.includes(parsed_intent.category)) {
    return comingSoonResponse(parsed_intent);
  }

  // 3. Geocode location
  const locationText = input.location ?? "Miami, FL";
  const fetchGeocode = createGeocodeFetcher(env.GOOGLE_GEOCODING_API_KEY);
  const { lat, lng } = await geocode(locationText, supabase as any, fetchGeocode);

  // 4. Query providers via PostGIS RPC
  const radiusMeters = RADIUS_MILES * METERS_PER_MILE;
  const { data: rawProviders, error } = await supabase.rpc("find_nearby_providers", {
    search_lat: lat,
    search_lng: lng,
    radius_meters: radiusMeters,
    trade_category: mapCategoryToDbValue(parsed_intent.category),
  });

  if (error || !rawProviders?.length) {
    await writeEvent(supabase as any, "search_no_results", null, {
      query: input.query,
      category: parsed_intent.category,
      location: locationText,
    });
    return noResultsResponse(parsed_intent);
  }

  // 5. Rank providers
  const scored = (rawProviders as any[]).map((p) => ({
    ...p,
    score: rankProvider(
      {
        license_status: p.license_status ?? "pending",
        avg_rating: p.avg_rating ?? 0,
        review_count: p.review_count ?? 0,
        distance_miles: (p.distance_meters ?? 0) / METERS_PER_MILE,
        price_range_low: p.price_range_low,
      },
      parsed_intent,
    ),
    distance_miles: (p.distance_meters ?? 0) / METERS_PER_MILE,
  }));
  scored.sort((a, b) => b.score - a.score);

  // 6. Take top results and format as ProviderMatch[]
  const top: ProviderMatch[] = scored.slice(0, MAX_RESULTS).map((p, i) => ({
    provider_id: p.id,
    name: p.name,
    trade_category: parsed_intent.category,
    license_status: p.license_status ?? "pending",
    license_number: p.license_number ?? null,
    avg_rating: p.avg_rating ?? 0,
    review_count: p.review_count ?? 0,
    price_range: p.price_range_low
      ? { low: p.price_range_low, high: p.price_range_high ?? p.price_range_low * 2 }
      : null,
    response_time_estimate: null,
    distance_miles: p.distance_miles,
    contact_methods: p.phone ? [{ type: "phone", value: p.phone }] : [],
    rank: i + 1,
    score: p.score,
  }));

  const requestId = `req_${Date.now()}`;
  const result: ServiceSearchResult = {
    parsed_intent,
    providers: top,
    request_id: requestId,
  };

  // 7. Log analytics events (fire-and-forget style — don't block response)
  await writeEvent(supabase as any, "search_initiated", null, {
    query: input.query,
    intent: parsed_intent,
    source,
    location: locationText,
  });
  await writeEvent(supabase as any, "match_displayed", null, {
    request_id: requestId,
    provider_ids: top.map((p) => p.provider_id),
    ranks: top.map((p) => p.rank),
    scores: top.map((p) => p.score),
  });

  // 8. Log to service_requests + matches tables
  try {
    const { data: reqData } = await (supabase.from("service_requests").insert({
      raw_query: input.query,
      parsed_intent,
      urgency: parsed_intent.urgency,
      location: locationText,
      category: parsed_intent.category,
      budget_max: parsed_intent.budget_max,
    }) as any)
      .select("id")
      .single();

    if (reqData?.id) {
      await supabase.from("matches").insert(
        top.map((p) => ({
          service_request_id: reqData.id,
          provider_id: p.provider_id,
          rank: p.rank,
          score: p.score,
        })),
      ) as any;
    }
  } catch {
    // DB logging must never break the search response
  }

  return { ...result, text_fallback: renderSearchResultAsText(result) };
}
