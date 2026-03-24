/**
 * Miami Provider Data Seed Script
 *
 * One-shot script to populate the Supabase `providers` table with real
 * provider data from Google Places and Yelp for the Miami metro area.
 *
 * Usage:
 *   # Dry run (fetch data but don't write to Supabase):
 *   GOOGLE_PLACES_API_KEY=xxx YELP_API_KEY=yyy npx tsx scripts/seed-miami.ts --dry-run
 *
 *   # Real seed:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=yyy GOOGLE_PLACES_API_KEY=zzz YELP_API_KEY=www npx tsx scripts/seed-miami.ts
 */

import { createClient } from "@supabase/supabase-js";
import {
  GRID_CENTERS,
  TRADE_TYPES,
  fetchGooglePlaces,
} from "../apps/mcp-server/src/pipeline/google-places";
import {
  fetchYelpBusinesses,
  YELP_CATEGORY_MAP,
} from "../apps/mcp-server/src/pipeline/yelp";
import { isDuplicate } from "../apps/mcp-server/src/pipeline/dedup";
import type { RawProviderData } from "@stoop/shared";

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  // Validate env vars
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  const yelpKey = process.env.YELP_API_KEY;

  if (!isDryRun && (!supabaseUrl || !supabaseKey)) {
    console.error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (use --dry-run to skip writes)",
    );
    process.exit(1);
  }

  console.log(
    `\n🏠 Stoop Miami Provider Seed ${isDryRun ? "(DRY RUN)" : ""}`,
  );
  console.log("========================================");

  // Phase 1: Fetch from Google Places
  let googleProviders: RawProviderData[] = [];
  if (googleKey) {
    console.log("\n📍 Fetching from Google Places...");
    for (const center of GRID_CENTERS) {
      for (const trade of TRADE_TYPES) {
        const results = await fetchGooglePlaces(center, trade, googleKey, fetch);
        googleProviders.push(...results);
        process.stdout.write(".");
      }
    }
    console.log(
      `\n   Found: ${googleProviders.length} raw results from ${GRID_CENTERS.length} centers × ${TRADE_TYPES.length} trades`,
    );
  } else {
    console.log("\n⚠️  GOOGLE_PLACES_API_KEY not set — skipping Google Places");
  }

  // Phase 2: Fetch from Yelp
  let yelpProviders: RawProviderData[] = [];
  if (yelpKey) {
    console.log("\n⭐ Fetching from Yelp...");
    for (const [trade, yelpCat] of Object.entries(YELP_CATEGORY_MAP)) {
      console.log(`   ${trade} (${yelpCat})...`);
      const results = await fetchYelpBusinesses(
        "Miami, FL",
        yelpCat,
        yelpKey,
        fetch,
      );
      yelpProviders.push(...results);
    }
    console.log(`   Found: ${yelpProviders.length} raw results`);
  } else {
    console.log("\n⚠️  YELP_API_KEY not set — skipping Yelp");
  }

  // Phase 3: Deduplicate
  console.log("\n🔗 Deduplicating...");
  const all = [...googleProviders, ...yelpProviders];
  const unique: RawProviderData[] = [];

  for (const provider of all) {
    const isDupe = unique.some((existing) =>
      isDuplicate(
        {
          phone: existing.phone,
          name: existing.name,
          address: existing.address,
        },
        { phone: provider.phone, name: provider.name, address: provider.address },
      ),
    );
    if (!isDupe) {
      unique.push(provider);
    }
  }

  console.log(`   Total raw: ${all.length}`);
  console.log(`   Duplicates removed: ${all.length - unique.length}`);
  console.log(`   Unique providers: ${unique.length}`);

  // Phase 4: Upsert to Supabase
  if (isDryRun) {
    console.log("\n🏁 DRY RUN — no data written to Supabase");
  } else {
    console.log("\n💾 Writing to Supabase...");
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    let written = 0;
    let errors = 0;

    for (const p of unique) {
      // Determine onConflict column based on source
      const conflictCol = p.google_place_id ? "google_place_id" : "yelp_id";

      const { error } = await supabase.from("providers").upsert(
        {
          name: p.name,
          google_place_id: p.google_place_id ?? null,
          yelp_id: p.yelp_id ?? null,
          phone: p.phone,
          address: p.address,
          location_geo: `SRID=4326;POINT(${p.lng} ${p.lat})`,
          categories: p.categories,
          avg_rating: p.avg_rating,
          review_count: p.review_count,
          price_range_low: null,
          price_range_high: null,
          hours: p.hours ?? null,
          photos: p.photos ?? [],
          data_freshness_at: new Date().toISOString(),
        },
        { onConflict: conflictCol },
      );

      if (error) {
        errors++;
        if (errors <= 5) {
          console.error(`   Error upserting ${p.name}: ${error.message}`);
        }
      } else {
        written++;
      }
    }

    console.log(`   Written: ${written}/${unique.length}`);
    if (errors > 0) {
      console.log(`   Errors: ${errors}${errors > 5 ? " (showing first 5)" : ""}`);
    }
  }

  // Report: breakdown by trade
  const byTrade: Record<string, number> = {};
  for (const p of unique) {
    for (const cat of p.categories) {
      byTrade[cat] = (byTrade[cat] ?? 0) + 1;
    }
  }

  console.log("\n📊 Breakdown by trade:");
  const sorted = Object.entries(byTrade).sort(([, a], [, b]) => b - a);
  for (const [trade, count] of sorted) {
    console.log(`   ${trade}: ${count}`);
  }

  console.log("\n✅ Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
