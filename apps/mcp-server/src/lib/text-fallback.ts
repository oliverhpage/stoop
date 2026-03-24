import type { ProviderMatch, ServiceSearchResult } from "@stoop/shared";

export function renderProviderAsText(provider: ProviderMatch, index: number): string {
  const lines: string[] = [];

  lines.push(`### ${index}. ${provider.name}`);

  // License line
  if (provider.license_status === "active" && provider.license_number) {
    lines.push(`✅ Licensed — ${provider.license_number}`);
  } else if (provider.license_status === "pending") {
    lines.push("⚠️ License check pending");
  } else {
    lines.push("❌ License inactive");
  }

  // Rating + price + distance
  const ratingPart = `⭐ ${provider.avg_rating} (${provider.review_count} reviews)`;
  const pricePart = provider.price_range
    ? `$${provider.price_range.low}–$${provider.price_range.high}`
    : "Contact for quote";
  lines.push(`${ratingPart} · ${pricePart}`);

  lines.push(`📍 ${provider.distance_miles} miles away`);

  // Contact methods
  const phone = provider.contact_methods.find((c) => c.type === "phone");
  if (phone) {
    lines.push(`📞 [Call: ${phone.value}](tel:${phone.value})`);
  }

  return lines.join("\n");
}

export function renderSearchResultAsText(result: ServiceSearchResult): string {
  const header = `## Found ${result.providers.length} providers`;
  const providerBlocks = result.providers.map((p, i) => renderProviderAsText(p, i + 1));
  return [header, "", ...providerBlocks].join("\n\n");
}
