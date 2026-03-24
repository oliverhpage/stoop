import type { Category } from "./types";

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  hvac: ["hvac", "a/c", "ac", "air condition", "heating", "furnace", "heat pump", "coolant", "thermostat"],
  plumbing: ["plumb", "pipe", "faucet", "toilet", "drain", "water heater", "sewer", "sprinkler"],
  electrical: ["electr", "outlet", "wiring", "panel", "circuit", "breaker", "light switch"],
  roofing: ["roof", "shingle", "gutter"],
  cleaning: ["clean", "maid", "janitorial", "pressure wash"],
  handyman: ["handyman", "odd job", "general repair"],
};

const MATCH_ORDER: Category[] = ["hvac", "plumbing", "electrical", "roofing", "cleaning", "handyman"];

export function detectCategory(query: string): Category | null {
  const lower = query.toLowerCase();
  for (const cat of MATCH_ORDER) {
    if (CATEGORY_KEYWORDS[cat].some((kw) => lower.includes(kw))) {
      return cat;
    }
  }
  return null;
}

export const URGENCY_KEYWORDS = {
  emergency: ["emergency", "urgent", "burst", "flooding", "sparking", "no heat", "no ac", "dangerous"],
  soon: ["soon", "this week", "asap", "broken"],
  planned: ["maintenance", "tune-up", "inspection", "annual", "spring", "seasonal"],
} as const;

export function detectUrgency(query: string): "emergency" | "soon" | "planned" | null {
  const lower = query.toLowerCase();
  for (const [urgency, keywords] of Object.entries(URGENCY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return urgency as "emergency" | "soon" | "planned";
    }
  }
  return null;
}

export const LICENSE_TYPE_MAP: Record<string, string> = {
  hvac: "CAC",
  plumbing: "CFC",
  electrical: "EC",
};

export const SUPPORTED_TRADES: Category[] = ["hvac", "plumbing", "electrical"];
