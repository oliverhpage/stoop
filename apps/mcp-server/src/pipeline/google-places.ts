import type { RawProviderData } from "@stoop/shared";

export const GRID_CENTERS = [
  { lat: 25.7617, lng: -80.1918, name: "Downtown Miami" },
  { lat: 25.8503, lng: -80.1384, name: "North Miami" },
  { lat: 25.6892, lng: -80.3164, name: "Kendall" },
  { lat: 25.9017, lng: -80.3063, name: "Hialeah" },
  { lat: 25.7903, lng: -80.2137, name: "Little Havana" },
  { lat: 25.8207, lng: -80.2831, name: "Doral" },
  { lat: 25.9420, lng: -80.1209, name: "Aventura" },
  { lat: 26.1224, lng: -80.1373, name: "Fort Lauderdale" },
  { lat: 26.0112, lng: -80.1495, name: "Hollywood" },
  { lat: 26.0629, lng: -80.2340, name: "Plantation" },
  { lat: 25.6579, lng: -80.4074, name: "Homestead" },
  { lat: 25.7260, lng: -80.2396, name: "Coral Gables" },
] as const;

export const TRADE_TYPES = ["plumber", "hvac_contractor", "electrician"] as const;

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.internationalPhoneNumber",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.regularOpeningHours",
  "places.types",
].join(",");

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  types?: string[];
}

function mapPlaceToRawProvider(place: GooglePlace): RawProviderData | null {
  const name = place.displayName?.text;
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;

  if (!name || lat == null || lng == null) return null;

  const hours: Record<string, string> = {};
  if (place.regularOpeningHours?.weekdayDescriptions) {
    for (const desc of place.regularOpeningHours.weekdayDescriptions) {
      const colonIdx = desc.indexOf(":");
      if (colonIdx > -1) {
        hours[desc.slice(0, colonIdx).trim()] = desc.slice(colonIdx + 1).trim();
      }
    }
  }

  return {
    name,
    phone: place.internationalPhoneNumber ?? null,
    address: place.formattedAddress ?? null,
    lat,
    lng,
    categories: place.types ?? [],
    avg_rating: place.rating ?? null,
    review_count: place.userRatingCount ?? 0,
    google_place_id: place.id,
    hours: Object.keys(hours).length > 0 ? hours : undefined,
  };
}

export async function fetchGooglePlaces(
  center: { lat: number; lng: number },
  tradeType: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<RawProviderData[]> {
  try {
    const response = await fetchFn(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify({
          includedTypes: [tradeType],
          locationRestriction: {
            circle: {
              center: { latitude: center.lat, longitude: center.lng },
              radius: 24140.0,
            },
          },
          maxResultCount: 20,
        }),
      },
    );

    if (!response.ok) return [];

    const data = (await response.json()) as { places?: GooglePlace[] };
    if (!data.places) return [];

    return data.places
      .map(mapPlaceToRawProvider)
      .filter((p): p is RawProviderData => p !== null);
  } catch {
    return [];
  }
}

export async function runFullGooglePipeline(
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<RawProviderData[]> {
  const results: RawProviderData[] = [];

  for (const center of GRID_CENTERS) {
    for (const trade of TRADE_TYPES) {
      const providers = await fetchGooglePlaces(center, trade, apiKey, fetchFn);
      results.push(...providers);
    }
  }

  return results;
}
