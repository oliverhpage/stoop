import type { RawProviderData } from "@stoop/shared";

const YELP_API_BASE = "https://api.yelp.com/v3/businesses/search";
const LOCATION = "Miami, FL";
const LIMIT = 50;
const MAX_RESULTS_PER_CATEGORY = 200;

export const YELP_CATEGORY_MAP: Record<string, string> = {
  HVAC: "hvacr",
  Plumbing: "plumbing",
  Electrical: "electricians",
};

interface YelpBusiness {
  id: string;
  name: string;
  phone?: string;
  location?: {
    display_address?: string[];
  };
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  rating?: number;
  review_count?: number;
  categories?: Array<{ alias: string; title: string }>;
  photos?: string[];
}

interface YelpSearchResponse {
  businesses?: YelpBusiness[];
  total?: number;
}

function mapYelpBusinessToRawProvider(
  business: YelpBusiness,
): RawProviderData | null {
  const lat = business.coordinates?.latitude;
  const lng = business.coordinates?.longitude;

  if (!business.name || lat == null || lng == null) return null;

  return {
    name: business.name,
    phone: business.phone || null,
    address: business.location?.display_address?.join(", ") ?? null,
    lat,
    lng,
    categories: business.categories?.map((c) => c.alias) ?? [],
    avg_rating: business.rating ?? null,
    review_count: business.review_count ?? 0,
    yelp_id: business.id,
    photos: business.photos,
  };
}

export async function fetchYelpBusinesses(
  location: string,
  category: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<RawProviderData[]> {
  const results: RawProviderData[] = [];

  try {
    for (let offset = 0; offset < MAX_RESULTS_PER_CATEGORY; offset += LIMIT) {
      const params = new URLSearchParams({
        location,
        categories: category,
        limit: String(LIMIT),
        sort_by: "rating",
        offset: String(offset),
      });

      const response = await fetchFn(`${YELP_API_BASE}?${params}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) return results;

      const data = (await response.json()) as YelpSearchResponse;
      if (!data.businesses || data.businesses.length === 0) break;

      for (const biz of data.businesses) {
        const provider = mapYelpBusinessToRawProvider(biz);
        if (provider) results.push(provider);
      }

      // Stop if we've fetched all available results
      if (data.businesses.length < LIMIT) break;
    }
  } catch {
    // Return whatever we've collected so far (or empty array)
  }

  return results;
}

export async function runFullYelpPipeline(
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<RawProviderData[]> {
  const results: RawProviderData[] = [];

  for (const category of Object.values(YELP_CATEGORY_MAP)) {
    const providers = await fetchYelpBusinesses(LOCATION, category, apiKey, fetchFn);
    results.push(...providers);
  }

  return results;
}
