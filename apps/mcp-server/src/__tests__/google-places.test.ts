import { describe, it, expect, vi } from "vitest";
import {
  GRID_CENTERS,
  TRADE_TYPES,
  fetchGooglePlaces,
  runFullGooglePipeline,
} from "../pipeline/google-places";

function mockFetchResponse(body: unknown, ok = true): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

const SAMPLE_PLACE = {
  id: "ChIJ_abc123",
  displayName: { text: "Cool Plumbing Co" },
  formattedAddress: "123 Main St, Miami, FL 33101",
  internationalPhoneNumber: "+1 305-555-1234",
  location: { latitude: 25.7617, longitude: -80.1918 },
  rating: 4.5,
  userRatingCount: 87,
  regularOpeningHours: {
    weekdayDescriptions: ["Monday: 8:00 AM – 5:00 PM", "Tuesday: 8:00 AM – 5:00 PM"],
  },
  types: ["plumber", "point_of_interest"],
};

describe("GRID_CENTERS", () => {
  it("has 12 entries", () => {
    expect(GRID_CENTERS).toHaveLength(12);
  });

  it("each entry has lat, lng, and name", () => {
    for (const center of GRID_CENTERS) {
      expect(center).toHaveProperty("lat");
      expect(center).toHaveProperty("lng");
      expect(center).toHaveProperty("name");
      expect(typeof center.lat).toBe("number");
      expect(typeof center.lng).toBe("number");
      expect(typeof center.name).toBe("string");
    }
  });
});

describe("TRADE_TYPES", () => {
  it("has 3 trade types", () => {
    expect(TRADE_TYPES).toHaveLength(3);
    expect(TRADE_TYPES).toContain("plumber");
    expect(TRADE_TYPES).toContain("hvac_contractor");
    expect(TRADE_TYPES).toContain("electrician");
  });
});

describe("fetchGooglePlaces", () => {
  it("parses API response into RawProviderData correctly", async () => {
    const mockFetch = mockFetchResponse({ places: [SAMPLE_PLACE] });

    const results = await fetchGooglePlaces(
      { lat: 25.7617, lng: -80.1918 },
      "plumber",
      "test-api-key",
      mockFetch,
    );

    expect(results).toHaveLength(1);
    const provider = results[0];
    expect(provider.name).toBe("Cool Plumbing Co");
    expect(provider.phone).toBe("+1 305-555-1234");
    expect(provider.address).toBe("123 Main St, Miami, FL 33101");
    expect(provider.lat).toBe(25.7617);
    expect(provider.lng).toBe(-80.1918);
    expect(provider.categories).toEqual(["plumber", "point_of_interest"]);
    expect(provider.avg_rating).toBe(4.5);
    expect(provider.review_count).toBe(87);
    expect(provider.google_place_id).toBe("ChIJ_abc123");
    expect(provider.hours).toEqual({
      Monday: "8:00 AM – 5:00 PM",
      Tuesday: "8:00 AM – 5:00 PM",
    });
  });

  it("sends correct request to Google Places API", async () => {
    const mockFetch = mockFetchResponse({ places: [] });

    await fetchGooglePlaces(
      { lat: 25.7617, lng: -80.1918 },
      "plumber",
      "my-key",
      mockFetch,
    );

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchNearby");
    expect(options.method).toBe("POST");
    expect(options.headers["X-Goog-Api-Key"]).toBe("my-key");
    expect(options.headers["X-Goog-FieldMask"]).toContain("places.id");

    const body = JSON.parse(options.body);
    expect(body.includedTypes).toEqual(["plumber"]);
    expect(body.locationRestriction.circle.center.latitude).toBe(25.7617);
    expect(body.locationRestriction.circle.radiusMeters).toBe(24140);
    expect(body.maxResultCount).toBe(20);
  });

  it("returns empty array on API error (non-ok response)", async () => {
    const mockFetch = mockFetchResponse({}, false);

    const results = await fetchGooglePlaces(
      { lat: 25.7617, lng: -80.1918 },
      "plumber",
      "bad-key",
      mockFetch,
    );

    expect(results).toEqual([]);
  });

  it("returns empty array on network error", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network failure")) as unknown as typeof fetch;

    const results = await fetchGooglePlaces(
      { lat: 25.7617, lng: -80.1918 },
      "plumber",
      "key",
      mockFetch,
    );

    expect(results).toEqual([]);
  });

  it("skips places with missing required fields", async () => {
    const incompletePlaces = {
      places: [
        { id: "no-name", location: { latitude: 25.0, longitude: -80.0 } },
        { id: "no-location", displayName: { text: "No Location" } },
        SAMPLE_PLACE,
      ],
    };
    const mockFetch = mockFetchResponse(incompletePlaces);

    const results = await fetchGooglePlaces(
      { lat: 25.7617, lng: -80.1918 },
      "plumber",
      "key",
      mockFetch,
    );

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Cool Plumbing Co");
  });
});

describe("runFullGooglePipeline", () => {
  it("calls fetchGooglePlaces 36 times (12 centers x 3 trades)", async () => {
    const mockFetch = mockFetchResponse({ places: [] });

    await runFullGooglePipeline("key", mockFetch);

    expect(mockFetch).toHaveBeenCalledTimes(36);
  });

  it("aggregates results from all calls", async () => {
    const mockFetch = mockFetchResponse({ places: [SAMPLE_PLACE] });

    const results = await runFullGooglePipeline("key", mockFetch);

    expect(results).toHaveLength(36);
  });
});
