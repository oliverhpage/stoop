import { describe, it, expect } from "vitest";
import { handleProviderProfile } from "../tools/provider-profile";

function mockSupabase(returnData: { data: unknown; error: unknown }) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => returnData,
        }),
      }),
    }),
  };
}

const fullProvider = {
  id: "p-1",
  name: "Cool Breeze HVAC",
  phone: "+13055551234",
  address: "123 Main St, Miami, FL 33101",
  categories: ["hvac"],
  avg_rating: 4.7,
  review_count: 42,
  price_range_low: 100,
  price_range_high: 500,
  hours: { mon: "8am-5pm" },
  photos: ["https://example.com/photo.jpg"],
  data_freshness_at: "2026-03-20T00:00:00Z",
  provider_verifications: [
    {
      license_number: "CAC1234567",
      license_type: "HVAC Contractor",
      license_status: "Current",
      license_expiry: "2027-01-01",
      disciplinary_actions: null,
      insurance_status: "verified",
    },
  ],
};

describe("handleProviderProfile", () => {
  it("returns full provider details with license info", async () => {
    const supabase = mockSupabase({ data: fullProvider, error: null });
    const result = await handleProviderProfile({ provider_id: "p-1" }, supabase);

    expect(result).toEqual({
      id: "p-1",
      name: "Cool Breeze HVAC",
      phone: "+13055551234",
      address: "123 Main St, Miami, FL 33101",
      categories: ["hvac"],
      avg_rating: 4.7,
      review_count: 42,
      price_range: { low: 100, high: 500 },
      hours: { mon: "8am-5pm" },
      photos: ["https://example.com/photo.jpg"],
      data_freshness_at: "2026-03-20T00:00:00Z",
      license: {
        number: "CAC1234567",
        type: "HVAC Contractor",
        status: "Current",
        expiry: "2027-01-01",
        disciplinary_actions: null,
        insurance_status: "verified",
      },
    });
  });

  it("returns error when provider not found", async () => {
    const supabase = mockSupabase({
      data: null,
      error: { message: "Row not found" },
    });
    const result = await handleProviderProfile({ provider_id: "nonexistent" }, supabase);

    expect(result).toEqual({ error: "Provider not found" });
  });

  it("handles provider with no verification record", async () => {
    const providerNoVerification = {
      ...fullProvider,
      provider_verifications: [],
    };
    const supabase = mockSupabase({ data: providerNoVerification, error: null });
    const result = await handleProviderProfile({ provider_id: "p-1" }, supabase);

    expect(result).not.toHaveProperty("error");
    expect((result as any).license).toBeNull();
    expect((result as any).name).toBe("Cool Breeze HVAC");
  });

  it("handles provider with null price range", async () => {
    const providerNoPrice = {
      ...fullProvider,
      price_range_low: null,
      price_range_high: null,
    };
    const supabase = mockSupabase({ data: providerNoPrice, error: null });
    const result = await handleProviderProfile({ provider_id: "p-1" }, supabase);

    expect((result as any).price_range).toBeNull();
  });
});
