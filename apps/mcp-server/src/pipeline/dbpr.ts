import { jaroWinkler } from "./dedup";

export interface RawDbprRecord {
  license_number: string;
  license_type: string;
  status: string;
  expiry: string;
  name: string;
  disciplinary: Array<{ date: string; action: string }>;
}

export interface ProcessedVerification {
  license_number: string;
  license_type: string;
  license_status: "active" | "inactive" | "expired" | "revoked" | "pending";
  license_expiry: string | null;
  disciplinary_actions: Array<{ date: string; action: string }>;
}

export interface MatchableProvider {
  id: string;
  name: string;
  license_hint: string | null;
}

/**
 * Map a raw DBPR status string to a normalized status.
 */
function mapStatus(
  status: string,
): ProcessedVerification["license_status"] {
  const normalized = status
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();

  if (normalized === "current,active") return "active";
  if (normalized === "revoked") return "revoked";
  if (normalized === "expired") return "expired";
  if (normalized.includes("inactive") || normalized.includes("null")) return "inactive";

  return "pending";
}

/**
 * Extract a short license type code from the DBPR full-text license type.
 */
function extractLicenseType(licenseType: string): string {
  const lower = licenseType.toLowerCase();

  if (lower.includes("plumbing")) return "CFC";
  if (lower.includes("air conditioning") || lower.includes("mechanical")) return "CAC";
  if (lower.includes("electrical")) return "EC";

  return "OTHER";
}

/**
 * Process a single raw DBPR record into a normalized verification record.
 */
export function processDbprResults(raw: RawDbprRecord): ProcessedVerification {
  return {
    license_number: raw.license_number,
    license_type: extractLicenseType(raw.license_type),
    license_status: mapStatus(raw.status),
    license_expiry: raw.expiry || null,
    disciplinary_actions: raw.disciplinary ?? [],
  };
}

/**
 * Match a DBPR record to an existing provider.
 * First tries exact match on license_number (if provider has a license_hint).
 * Then tries fuzzy match on business name using Jaro-Winkler (threshold > 0.80).
 */
export function matchProviderToLicense(
  providers: MatchableProvider[],
  licenseNumber: string,
  businessName?: string,
): MatchableProvider | null {
  // Exact match on license number
  for (const provider of providers) {
    if (provider.license_hint && provider.license_hint === licenseNumber) {
      return provider;
    }
  }

  // Fuzzy match on business name
  if (businessName) {
    let bestMatch: MatchableProvider | null = null;
    let bestScore = 0;

    for (const provider of providers) {
      const score = jaroWinkler(provider.name, businessName);
      if (score > 0.80 && score > bestScore) {
        bestScore = score;
        bestMatch = provider;
      }
    }

    return bestMatch;
  }

  return null;
}

/**
 * Run the full DBPR pipeline: process records, match to providers, return
 * matched results ready for upsert.
 */
export async function runDbprPipeline(
  dbprData: RawDbprRecord[],
  providers: MatchableProvider[],
): Promise<
  Array<{
    provider: MatchableProvider;
    verification: ProcessedVerification;
  }>
> {
  const matched: Array<{
    provider: MatchableProvider;
    verification: ProcessedVerification;
  }> = [];

  for (const raw of dbprData) {
    const verification = processDbprResults(raw);
    const provider = matchProviderToLicense(
      providers,
      raw.license_number,
      raw.name,
    );

    if (provider) {
      matched.push({ provider, verification });
    }
  }

  return matched;
}
