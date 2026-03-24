import { describe, it, expect, vi } from "vitest";
import {
  fetchYelpBusinesses,
  runFullYelpPipeline,
  YELP_CATEGORY_MAP,
} from "../pipeline/yelp";

function mockFetchResponse(body: unknown, ok = true): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

const SAMPLE_BUSINESS = {
  id: "cool-plumbing-miami",
  name: "Cool Plumbing Co",
  phone: "+13055551234",
  location: {
    display_address: ["123 Main St", "Miami, FL 33101"],
  },
  coordinates: {
    latitude: 25.7617,
    longitude: -80.1918,
  },
  rating: 4.5,
  review_count: 87,
  categories: [
    { alias: "plumbing", title: "Plumbing" },
    { alias: "waterheaterinstallation", title: "Water Heater Installation" },
  ],
  photos: ["https://s3-media1.fl.yelpcdn.com/bphoto/abc/o.jpg"],
};

describe("fetchYelpBusinesses", () => {
  it("parses response into RawProviderData correctly", async () => {
    const mockFetch = mockFetchResponse({ businesses: [SAMPLE_BUSINESS] });

    const results = await fetchYelpBusinesses(
      "Miami, FL",
      "plumbing",
      "test-api-key",
      mockFetch,
    );

    expect(results).toHaveLength(1);
    const provider = results[0];
    expect(provider.name).toBe("Cool Plumbing Co");
    expect(provider.phone).toBe("+13055551234");
    expect(provider.address).toBe("123 Main St, Miami, FL 33101");
    expect(provider.lat).toBe(25.7617);
    expect(provider.lng).toBe(-80.1918);
    expect(provider.categories).toEqual(["plumbing", "waterheaterinstallation"]);
    expect(provider.avg_rating).toBe(4.5);
    expect(provider.review_count).toBe(87);
    expect(provider.yelp_id).toBe("cool-plumbing-miami");
    expect(provider.photos).toEqual(["https://s3-media1.fl.yelpcdn.com/bphoto/abc/o.jpg"]);
  });

  it("returns empty array on API error", async () => {
    const mockFetch = mockFetchResponse({}, false);

    const results = await fetchYelpBusinesses(
      "Miami, FL",
      "plumbing",
      "bad-key",
      mockFetch,
    );

    expect(results).toEqual([]);
  });

  it("sends correct request to Yelp API", async () => {
    const mockFetch = mockFetchResponse({ businesses: [] });

    await fetchYelpBusinesses("Miami, FL", "hvacr", "my-key", mockFetch);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("https://api.yelp.com/v3/businesses/search");
    expect(url).toContain("categories=hvacr");
    expect(url).toContain("location=Miami");
    expect(url).toContain("limit=50");
    expect(url).toContain("sort_by=rating");
    expect(url).toContain("offset=0");
    expect(options.headers.Authorization).toBe("Bearer my-key");
  });

  it("paginates up to 200 results", async () => {
    const page = { businesses: Array(50).fill(SAMPLE_BUSINESS) };
    const mockFetch = mockFetchResponse(page);

    await fetchYelpBusinesses("Miami, FL", "plumbing", "key", mockFetch);

    // 200 / 50 = 4 pages
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it("stops pagination when fewer than limit results returned", async () => {
    const smallPage = { businesses: [SAMPLE_BUSINESS] };
    const mockFetch = mockFetchResponse(smallPage);

    const results = await fetchYelpBusinesses("Miami, FL", "plumbing", "key", mockFetch);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
  });

  it("returns empty array on network error", async () => {
    const mockFetch = vi.fn().mockRejectedValue(
      new Error("Network failure"),
    ) as unknown as typeof fetch;

    const results = await fetchYelpBusinesses("Miami, FL", "plumbing", "key", mockFetch);

    expect(results).toEqual([]);
  });

  it("skips businesses with missing coordinates", async () => {
    const noCoordsBusinesses = {
      businesses: [
        { id: "no-coords", name: "No Coords Co" },
        SAMPLE_BUSINESS,
      ],
    };
    const mockFetch = mockFetchResponse(noCoordsBusinesses);

    const results = await fetchYelpBusinesses("Miami, FL", "plumbing", "key", mockFetch);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Cool Plumbing Co");
  });
});

describe("YELP_CATEGORY_MAP", () => {
  it("maps Yelp categories to our trade categories", () => {
    expect(YELP_CATEGORY_MAP.HVAC).toBe("hvacr");
    expect(YELP_CATEGORY_MAP.Plumbing).toBe("plumbing");
    expect(YELP_CATEGORY_MAP.Electrical).toBe("electricians");
  });
});

describe("runFullYelpPipeline", () => {
  it("calls fetchYelpBusinesses for all 3 categories", async () => {
    const mockFetch = mockFetchResponse({ businesses: [SAMPLE_BUSINESS] });

    const results = await runFullYelpPipeline("key", mockFetch);

    // 3 categories, each with 1 result (single page)
    expect(results).toHaveLength(3);
    // 3 fetch calls (one per category)
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
