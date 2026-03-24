-- ============================================================
-- Stoop Home Services — Initial Schema Migration
-- ============================================================

-- 1. Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- 2. Tables
-- ============================================================

-- users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_auth_id UUID UNIQUE NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'homeowner' CHECK (role IN ('homeowner', 'provider', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_supabase_auth_id ON users (supabase_auth_id);

-- home_profiles
CREATE TABLE home_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  property_data JSONB DEFAULT '{}',
  completeness_score INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- providers
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  google_place_id TEXT,
  yelp_id TEXT,
  phone TEXT,
  address TEXT,
  location_geo GEOGRAPHY(POINT, 4326),
  categories TEXT[] NOT NULL DEFAULT '{}',
  avg_rating NUMERIC(3,2) CHECK (avg_rating >= 1.0 AND avg_rating <= 5.0),
  review_count INT DEFAULT 0,
  price_range_low INT,
  price_range_high INT,
  hours JSONB,
  photos TEXT[],
  data_freshness_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_providers_location_geo ON providers USING GIST (location_geo);
CREATE INDEX idx_providers_categories ON providers USING GIN (categories);
CREATE INDEX idx_providers_avg_rating ON providers (avg_rating DESC);
CREATE INDEX idx_providers_google_place_id ON providers (google_place_id);
CREATE INDEX idx_providers_yelp_id ON providers (yelp_id);

-- provider_verifications
CREATE TABLE provider_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers (id) ON DELETE CASCADE,
  license_number TEXT,
  license_type TEXT,
  license_status TEXT CHECK (license_status IN ('active', 'inactive', 'expired', 'revoked', 'pending')),
  license_expiry DATE,
  disciplinary_actions JSONB DEFAULT '[]',
  insurance_status TEXT CHECK (insurance_status IN ('verified', 'unverified', 'expired')),
  insurance_verified_at TIMESTAMPTZ,
  dbpr_last_checked TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_provider_verifications_provider_id ON provider_verifications (provider_id);
CREATE INDEX idx_provider_verifications_license_number ON provider_verifications (license_number);

-- service_requests
CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users (id),
  raw_query TEXT NOT NULL,
  parsed_intent JSONB NOT NULL,
  urgency TEXT CHECK (urgency IN ('emergency', 'soon', 'planned')),
  location TEXT,
  location_geo GEOGRAPHY(POINT, 4326),
  category TEXT,
  budget_max INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_requests_user_id ON service_requests (user_id);
CREATE INDEX idx_service_requests_created_at ON service_requests (created_at DESC);
CREATE INDEX idx_service_requests_category ON service_requests (category);

-- matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL REFERENCES service_requests (id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers (id),
  rank INT NOT NULL CHECK (rank BETWEEN 1 AND 3),
  score NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_matches_service_request_id ON matches (service_request_id);
CREATE INDEX idx_matches_provider_id ON matches (provider_id);

-- contacts
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches (id),
  user_id UUID NOT NULL REFERENCES users (id),
  contact_method TEXT CHECK (contact_method IN ('phone', 'sms', 'booking_request')),
  contacted_at TIMESTAMPTZ DEFAULT now(),
  provider_responded_at TIMESTAMPTZ
);

CREATE INDEX idx_contacts_user_id ON contacts (user_id);
CREATE INDEX idx_contacts_match_id ON contacts (match_id);

-- analytics_events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_type_created ON analytics_events (event_type, created_at DESC);
CREATE INDEX idx_analytics_events_user_id ON analytics_events (user_id);

-- bookings (Ring 2 — empty shell)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts (id),
  status TEXT CHECK (status IN ('confirmed', 'completed', 'cancelled')),
  job_value INT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_contact_id ON bookings (contact_id);
CREATE INDEX idx_bookings_status ON bookings (status);

-- reviews (Ring 2 — empty shell)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings (id),
  user_id UUID NOT NULL REFERENCES users (id),
  provider_id UUID NOT NULL REFERENCES providers (id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_provider_id ON reviews (provider_id);
CREATE INDEX idx_reviews_rating ON reviews (rating);

-- provider_subscriptions (Ring 3 — empty shell)
CREATE TABLE provider_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers (id),
  stripe_subscription_id TEXT,
  tier TEXT CHECK (tier IN ('free', 'verified', 'premium')) DEFAULT 'free',
  status TEXT CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_provider_subscriptions_provider_id ON provider_subscriptions (provider_id);
CREATE INDEX idx_provider_subscriptions_status ON provider_subscriptions (status);

-- ============================================================
-- 3. geocode_cache
-- ============================================================

CREATE TABLE geocode_cache (
  location_key TEXT PRIMARY KEY,
  location_geo GEOGRAPHY(POINT, 4326) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. Row-Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE geocode_cache ENABLE ROW LEVEL SECURITY;

-- users: owners can manage their own row
CREATE POLICY users_self ON users
  FOR ALL
  USING (supabase_auth_id = auth.uid());

-- home_profiles: owners can manage their own profile
CREATE POLICY profiles_owner ON home_profiles
  FOR ALL
  USING (user_id = (SELECT id FROM users WHERE supabase_auth_id = auth.uid()));

-- providers: anyone can read, only admins can write
CREATE POLICY providers_read ON providers
  FOR SELECT
  USING (true);

CREATE POLICY providers_admin_write ON providers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE supabase_auth_id = auth.uid()
        AND role = 'admin'
    )
  );

-- provider_verifications: anyone can read
CREATE POLICY verifications_read ON provider_verifications
  FOR SELECT
  USING (true);

-- service_requests: owners can read their own, anonymous requests visible too
CREATE POLICY requests_owner ON service_requests
  FOR SELECT
  USING (user_id IS NULL OR user_id = (SELECT id FROM users WHERE supabase_auth_id = auth.uid()));

-- service_requests: anyone can insert (supports anonymous usage)
CREATE POLICY requests_insert ON service_requests
  FOR INSERT
  WITH CHECK (true);

-- matches: readable if you own the parent service_request
CREATE POLICY matches_read ON matches
  FOR SELECT
  USING (
    service_request_id IN (
      SELECT id FROM service_requests
      WHERE user_id IS NULL
         OR user_id = (SELECT id FROM users WHERE supabase_auth_id = auth.uid())
    )
  );

-- contacts: owners can manage their own contacts
CREATE POLICY contacts_owner ON contacts
  FOR ALL
  USING (user_id = (SELECT id FROM users WHERE supabase_auth_id = auth.uid()));

-- analytics_events: anyone can insert, only admins can read
CREATE POLICY events_insert ON analytics_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY events_admin_read ON analytics_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE supabase_auth_id = auth.uid()
        AND role = 'admin'
    )
  );
