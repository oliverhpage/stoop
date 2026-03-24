-- ============================================================
-- Stoop Home Services — PostGIS RPC for nearby provider search
-- ============================================================

CREATE OR REPLACE FUNCTION find_nearby_providers(
  search_lat DOUBLE PRECISION,
  search_lng DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION,
  trade_category TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  address TEXT,
  categories TEXT[],
  avg_rating NUMERIC,
  review_count INT,
  price_range_low INT,
  price_range_high INT,
  distance_meters DOUBLE PRECISION,
  license_status TEXT,
  license_number TEXT,
  license_type TEXT
) AS $$
  SELECT
    p.id, p.name, p.phone, p.address,
    p.categories, p.avg_rating, p.review_count,
    p.price_range_low, p.price_range_high,
    ST_Distance(p.location_geo, ST_MakePoint(search_lng, search_lat)::geography) as distance_meters,
    pv.license_status, pv.license_number, pv.license_type
  FROM providers p
  LEFT JOIN provider_verifications pv ON pv.provider_id = p.id
  WHERE trade_category = ANY(p.categories)
    AND ST_DWithin(p.location_geo, ST_MakePoint(search_lng, search_lat)::geography, radius_meters)
  ORDER BY p.avg_rating DESC NULLS LAST
  LIMIT 50;
$$ LANGUAGE sql STABLE;
