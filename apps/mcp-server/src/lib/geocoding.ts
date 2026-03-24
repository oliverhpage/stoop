export const MIAMI_CENTROID = { lat: 25.7617, lng: -80.1918 };

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type GeocodeFetch = (
  query: string,
) => Promise<{
  results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
  status: string;
}>;

/**
 * Normalize a location string for use as a cache key.
 * Lowercases, trims, and collapses whitespace/punctuation into single spaces.
 */
export function normalizeLocationKey(location: string): string {
  return location
    .toLowerCase()
    .trim()
    .replace(/[,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Geocode a location string to lat/lng coordinates.
 *
 * 1. Check Supabase `geocode_cache` table
 * 2. On miss, call Google Geocoding API via injected fetch
 * 3. On API success, cache result (fire-and-forget)
 * 4. On total failure, return MIAMI_CENTROID
 */
export async function geocode(
  locationText: string,
  supabase: {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          single: () => Promise<{ data: { lat: number; lng: number } | null; error: unknown }>;
        };
      };
      insert: (row: Record<string, unknown>) => Promise<unknown>;
    };
  },
  fetchGeocode: GeocodeFetch,
): Promise<GeoPoint> {
  const key = normalizeLocationKey(locationText);

  // 1. Check cache
  try {
    const { data, error } = await supabase
      .from("geocode_cache")
      .select("lat, lng")
      .eq("location_key", key)
      .single();

    if (!error && data) {
      return { lat: data.lat, lng: data.lng };
    }
  } catch {
    // Cache lookup failed — continue to API
  }

  // 2. Call Google Geocoding API
  try {
    const response = await fetchGeocode(key);

    if (response.status === "OK" && response.results.length > 0) {
      const { lat, lng } = response.results[0].geometry.location;

      // 3. Fire-and-forget cache store
      supabase
        .from("geocode_cache")
        .insert({ location_key: key, lat, lng })
        .catch(() => {});

      return { lat, lng };
    }
  } catch {
    // API call failed — fall through to default
  }

  // 4. Default fallback
  return { ...MIAMI_CENTROID };
}
