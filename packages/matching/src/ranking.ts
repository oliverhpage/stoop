import type { ParsedIntent } from "@stoop/shared";
import { DEFAULT_WEIGHTS } from "./constants";

export interface RankableProvider {
  license_status: "active" | "inactive" | "pending" | "expired" | "revoked";
  avg_rating: number;
  review_count: number;
  distance_miles: number;
  price_range_low?: number | null;
  available_today?: boolean | null;
}

export function rankProvider(provider: RankableProvider, intent: ParsedIntent): number {
  let score = 0;

  if (provider.license_status === "active") score += DEFAULT_WEIGHTS.license_verified;

  score += (provider.avg_rating / 5) * DEFAULT_WEIGHTS.rating;

  score += Math.min(Math.log10(provider.review_count + 1) * 5, DEFAULT_WEIGHTS.review_count);

  score += Math.max(DEFAULT_WEIGHTS.proximity - provider.distance_miles, 0);

  const available = provider.available_today ?? true;
  if (available) score += DEFAULT_WEIGHTS.availability;

  if (
    !intent.budget_max ||
    (provider.price_range_low != null && provider.price_range_low <= intent.budget_max)
  ) {
    score += DEFAULT_WEIGHTS.price_match;
  }

  if (intent.urgency === "emergency") {
    score += available ? 15 : 0;
  }

  return score;
}
