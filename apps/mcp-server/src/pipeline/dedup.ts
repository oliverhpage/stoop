export interface DedupCandidate {
  phone: string | null;
  name: string;
  address: string | null;
}

const ABBREVIATIONS: Record<string, string> = {
  st: "street",
  ave: "avenue",
  blvd: "boulevard",
  dr: "drive",
  ln: "lane",
  ct: "court",
  rd: "road",
  pl: "place",
  cir: "circle",
};

/**
 * Normalize an address for comparison: lowercase, expand abbreviations,
 * strip suite/unit/apt/ste/# numbers.
 */
export function normalizeAddress(addr: string): string {
  let result = addr.toLowerCase().trim();

  // Strip suite/unit/apt/ste/# and following alphanumeric identifier
  result = result.replace(/\b(suite|unit|apt|ste|#)\s*\w+\b/gi, "");

  // Expand abbreviations (word-boundary match)
  result = result.replace(/\b(\w+)\b/g, (match) => {
    return ABBREVIATIONS[match] ?? match;
  });

  // Collapse whitespace
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

/**
 * Standard Jaro-Winkler similarity (0.0 to 1.0).
 */
export function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;

  const a = s1.toLowerCase();
  const b = s2.toLowerCase();

  if (a.length === 0 || b.length === 0) return 0.0;

  const matchWindow = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);

  const aMatches = new Array<boolean>(a.length).fill(false);
  const bMatches = new Array<boolean>(b.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, b.length);

    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix bonus (up to 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Normalize a phone number: strip non-digits, take last 10 chars.
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-10);
}

/**
 * Returns true if two candidates are likely the same provider.
 * Match criteria:
 *   (a) phone numbers match (after normalization), OR
 *   (b) name Jaro-Winkler > 0.85 AND address Jaro-Winkler > 0.80
 */
export function isDuplicate(a: DedupCandidate, b: DedupCandidate): boolean {
  // Phone match
  if (a.phone && b.phone) {
    const phoneA = normalizePhone(a.phone);
    const phoneB = normalizePhone(b.phone);
    if (phoneA.length >= 10 && phoneA === phoneB) return true;
  }

  // Name + address similarity
  const nameSim = jaroWinkler(a.name, b.name);
  if (nameSim <= 0.85) return false;

  if (a.address && b.address) {
    const addrSim = jaroWinkler(normalizeAddress(a.address), normalizeAddress(b.address));
    if (addrSim > 0.80) return true;
  }

  return false;
}
