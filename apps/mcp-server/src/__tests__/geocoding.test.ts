import { describe, it, expect, vi } from "vitest";
import {
  geocode,
  normalizeLocationKey,
  MIAMI_CENTROID,
  type GeocodeFetch,
} from "../lib/geocoding";

/** Helper: build a mock Supabase client with chainable query builder. */
function mockSupabase(cacheResult: { lat: number; lng: number } | null) {
  const insertFn = vi.fn().mockResolvedValue({ error: null });
  return {
    client: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: cacheResult,
              error: cacheResult ? null : { code: "PGRST116" },
            }),
          }),
        }),
        insert: insertFn,
      }),
    },
    insertFn,
  };
}

/** Helper: build a mock GeocodeFetch that returns given coordinates. */
function mockFetch(lat: number, lng: number): GeocodeFetch {
  return vi.fn().mockResolvedValue({
    results: [{ geometry: { location: { lat, lng } } }],
    status: "OK",
  });
}

/** Helper: build a mock GeocodeFetch that throws. */
function mockFetchError(): GeocodeFetch {
  return vi.fn().mockRejectedValue(new Error("Network error"));
}

describe("normalizeLocationKey", () => {
  it("lowercases and trims", () => {
    expect(normalizeLocationKey("  Miami  ")).toBe("miami");
  });

  it("collapses whitespace and removes commas", () => {
    expect(normalizeLocationKey("Miami, FL")).toBe("miami fl");
  });

  it("handles zip codes", () => {
    expect(normalizeLocationKey(" 33130 ")).toBe("33130");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeLocationKey("South   Beach,  Miami")).toBe("south beach miami");
  });
});

describe("geocode", () => {
  it("returns cached result when available (no API call)", async () => {
    const { client } = mockSupabase({ lat: 25.77, lng: -80.19 });
    const fetch = vi.fn() as unknown as GeocodeFetch;

    const result = await geocode("Miami", client, fetch);

    expect(result).toEqual({ lat: 25.77, lng: -80.19 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("calls API on cache miss and stores result", async () => {
    const { client, insertFn } = mockSupabase(null);
    const fetch = mockFetch(25.76, -80.20);

    const result = await geocode("Coral Gables", client, fetch);

    expect(result).toEqual({ lat: 25.76, lng: -80.20 });
    expect(fetch).toHaveBeenCalledWith("coral gables");
    // Fire-and-forget insert should have been called
    expect(insertFn).toHaveBeenCalledWith({
      location_key: "coral gables",
      lat: 25.76,
      lng: -80.20,
    });
  });

  it("returns MIAMI_CENTROID when cache miss and API fails", async () => {
    const { client } = mockSupabase(null);
    const fetch = mockFetchError();

    const result = await geocode("Nowhere", client, fetch);

    expect(result).toEqual(MIAMI_CENTROID);
  });

  it("returns MIAMI_CENTROID when API returns zero results", async () => {
    const { client } = mockSupabase(null);
    const fetch = vi.fn().mockResolvedValue({
      results: [],
      status: "ZERO_RESULTS",
    }) as unknown as GeocodeFetch;

    const result = await geocode("xyzxyz", client, fetch);

    expect(result).toEqual(MIAMI_CENTROID);
  });

  it("normalizes the location key for cache lookup and API call", async () => {
    const { client } = mockSupabase(null);
    const fetch = mockFetch(25.80, -80.13);

    await geocode("  Miami,   FL  ", client, fetch);

    // The fetch should receive the normalized key
    expect(fetch).toHaveBeenCalledWith("miami fl");
  });
});
