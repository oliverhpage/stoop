export interface ProviderProfileResult {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  categories: string[];
  avg_rating: number | null;
  review_count: number;
  price_range: { low: number; high: number } | null;
  hours: Record<string, string> | null;
  photos: string[];
  data_freshness_at: string | null;
  license: {
    number: string;
    type: string;
    status: string;
    expiry: string | null;
    disciplinary_actions: unknown;
    insurance_status: string | null;
  } | null;
}

export async function handleProviderProfile(
  input: { provider_id: string },
  supabase: any,
): Promise<ProviderProfileResult | { error: string }> {
  const { data, error } = await supabase
    .from("providers")
    .select(`
      id, name, phone, address, categories, avg_rating, review_count,
      price_range_low, price_range_high, hours, photos, data_freshness_at,
      provider_verifications (
        license_number, license_type, license_status,
        license_expiry, disciplinary_actions, insurance_status
      )
    `)
    .eq("id", input.provider_id)
    .single();

  if (error || !data) {
    return { error: "Provider not found" };
  }

  const verification = data.provider_verifications?.[0];

  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    address: data.address,
    categories: data.categories,
    avg_rating: data.avg_rating,
    review_count: data.review_count,
    price_range: data.price_range_low
      ? { low: data.price_range_low, high: data.price_range_high }
      : null,
    hours: data.hours,
    photos: data.photos,
    data_freshness_at: data.data_freshness_at,
    license: verification
      ? {
          number: verification.license_number,
          type: verification.license_type,
          status: verification.license_status,
          expiry: verification.license_expiry,
          disciplinary_actions: verification.disciplinary_actions,
          insurance_status: verification.insurance_status,
        }
      : null,
  };
}
