import { z } from "zod";

export const CATEGORIES = ["hvac", "plumbing", "electrical", "cleaning", "handyman", "roofing"] as const;
export type Category = (typeof CATEGORIES)[number];

export const URGENCIES = ["emergency", "soon", "planned"] as const;
export type Urgency = (typeof URGENCIES)[number];

export const PropertyDataSchema = z.object({
  type: z.enum(["house", "condo", "townhouse", "other"]).optional(),
  year_built: z.enum(["before_1970", "1970_1990", "1990_2010", "after_2010", "unknown"]).optional(),
  sqft: z.enum(["under_1000", "1000_2000", "2000_3000", "over_3000", "unknown"]).optional(),
  heating_system: z.enum(["gas_furnace", "electric", "heat_pump", "unknown"]).optional(),
  cooling_system: z.enum(["central_ac", "window_units", "mini_split", "none", "unknown"]).optional(),
  water_heater_type: z.enum(["tank_gas", "tank_electric", "tankless", "unknown"]).optional(),
  roof_type: z.enum(["tile", "shingle", "metal", "flat", "unknown"]).optional(),
  sewer_type: z.enum(["septic", "city_sewer", "unknown"]).optional(),
  scheduling_preference: z.enum(["morning", "afternoon", "evening", "no_preference"]).optional(),
  location_geo: z.object({ lat: z.number(), lng: z.number() }).optional(),
  preferred_providers: z.array(z.string()).optional(),
});
export type PropertyData = z.infer<typeof PropertyDataSchema>;

export const ParsedIntentSchema = z.object({
  category: z.enum(CATEGORIES),
  subcategory: z.string(),
  urgency: z.enum(URGENCIES),
  timing: z.string(),
  budget_max: z.number().nullable(),
  special_requirements: z.string().nullable(),
  multi_service: z.boolean(),
});
export type ParsedIntent = z.infer<typeof ParsedIntentSchema>;

export interface ProviderMatch {
  provider_id: string;
  name: string;
  trade_category: string;
  license_status: "active" | "inactive" | "pending";
  license_number: string | null;
  avg_rating: number;
  review_count: number;
  price_range: { low: number; high: number } | null;
  response_time_estimate: string | null;
  distance_miles: number;
  contact_methods: { type: string; value: string }[];
  rank: number;
  score: number;
}

export interface ServiceSearchResult {
  parsed_intent: ParsedIntent;
  providers: ProviderMatch[];
  request_id: string;
}
