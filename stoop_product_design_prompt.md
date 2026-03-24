# STOOP PRODUCT DESIGN & TECH STACK PROMPT

## How to Use This Prompt

1. Start a **NEW conversation** with Claude (fresh context window)
2. Attach the Stoop Home Services Comprehensive PRD (.docx)
3. Paste this entire prompt below
4. Claude will produce a complete product design system and buildable technical architecture

---

## THE PROMPT

You are the world's greatest product designer — someone who has shipped consumer products used by tens of millions of people, designed systems at the intersection of AI and real-world services, and built engineering teams that deliver on time with small headcounts. You think in systems, not screens. You design for the moments that matter, not for feature checklists. You've personally built and launched products at the caliber of Stripe's API experience, Linear's interaction design, and Airbnb's trust architecture.

You also have deep technical architecture experience. You've designed systems that handle millions of requests per day on budgets under $500/month. You know the difference between infrastructure that impresses VCs and infrastructure that actually ships. You default to boring technology that works.

I'm attaching the Stoop Home Services PRD. Read it completely before you begin.

Your job is to produce **two deliverables** — a Product Design System and a Technical Architecture Specification — that a 3-person engineering team in Puerto Rico could start building from on Day 1. Everything you produce must be specific enough to build, opinionated enough to be useful, and honest about tradeoffs.

---

## DELIVERABLE 1: PRODUCT DESIGN SYSTEM

### 1.1 Design Principles (5 principles max)
Define the design principles that govern every decision in the product. Each principle should include:
- The principle itself (one sentence)
- Why it matters for home services specifically (not generic "good design")
- A concrete example of a design decision this principle would resolve
- What you'd sacrifice to uphold this principle

Example format: "Trust before action — never ask a homeowner to take action on a provider they can't yet trust. This means we show license verification and review data BEFORE showing a Contact button, even if it costs us click-through rate."

### 1.2 Information Architecture
Map the complete information architecture across ALL touchpoints:

**MCP App Components (inside AI conversations)**
- Every screen/card/component the user sees inside Claude or ChatGPT
- The exact information hierarchy of each component (what's shown first, what's expandable, what's hidden)
- State management: what happens when data is loading, empty, errored, or stale?
- Interaction patterns: what is tappable, swipeable, expandable? What triggers what?

**Homeowner Web App**
- Complete sitemap with page purposes
- Navigation model (how do users move between sections?)
- Key pages: Home Dashboard, Service History, Home Profile, Saved Providers, Account Settings
- What data drives each page? What's the empty state for each?

**Provider Dashboard (Web App)**
- Complete sitemap
- Key pages: Lead Feed, Profile Editor, Analytics, Subscription Management
- Provider onboarding flow (from "you've been recommended" email to active profile)

### 1.3 Core User Flows (Detailed Wireframe-Level)
For each of these flows, describe every step at wireframe fidelity — what the user sees, what they can do, what happens next, and what data moves where. Use a numbered step format.

**Flow 1: Emergency Service Search (via MCP App in Claude)**
- From: User types urgent request
- Through: Intent confirmation → provider results → contact initiation
- To: Post-service follow-up
- Include: error states, edge cases (no providers available, all lines busy, provider doesn't respond)

**Flow 2: Planned Maintenance Booking (via MCP App in ChatGPT)**
- From: User requests seasonal maintenance
- Through: Previous provider recall → scheduling → booking confirmation
- To: Calendar reminder and service completion
- Include: what's different about the ChatGPT rendering vs Claude

**Flow 3: New Homeowner Onboarding (Multi-Trade Discovery)**
- From: First-time user with complex multi-trade needs
- Through: Progressive home profile building → multi-provider matching → service plan creation
- To: Ongoing relationship (home profile grows, reminders trigger)

**Flow 4: Provider Claims Profile (Provider-Side)**
- From: Provider receives "You've been recommended X times" email
- Through: Profile claim → verification → dashboard setup
- To: First subscription conversion

**Flow 5: Homeowner Returns for Second Service (Retention Flow)**
- From: Returning user with an existing home profile
- Through: Personalized matching (knows their home, preferences, history)
- To: Updated service timeline
- Include: what's different about the experience vs. first-time

### 1.4 MCP App Component Design Specifications
For each MCP App component, specify in detail:

**Provider Match Card**
- Exact fields shown in default (collapsed) state
- Exact fields shown in expanded state
- Visual hierarchy (size, weight, color intent for each element)
- Interactive elements and their behaviors
- Responsive behavior (mobile vs. desktop AI chat widths)
- Accessibility requirements
- Loading skeleton design
- Error state (e.g., license data unavailable)

**Service Request Summary Card**
- How the parsed intent is displayed back to the user
- Which fields are editable inline vs. require re-prompting
- Urgency indicator design (visual language for emergency vs. planned)
- Confidence indicators (how confident is the system in its parsing?)

**Home Profile Card**
- Progressive disclosure design — what shows at profile completeness levels of 10%, 30%, 60%, 90%
- How new questions are introduced (inline? modal? conversational?)
- Visual representation of home "health" or completeness
- Cross-AI portability indicator (shows that profile works on Claude AND ChatGPT)

**Job History Timeline**
- Chronological layout design
- Filtering and grouping logic
- "Book Again" interaction pattern
- Integration with provider match cards (tapping a past provider shows current availability)

**Booking Confirmation Card**
- What's shown after successful contact initiation
- Next steps for the homeowner
- Provider's expected response time
- Fallback if provider doesn't respond within X time

### 1.5 Design Language & Visual System
Define a complete design language that works across MCP App cards AND web applications:

- **Color system**: Primary, secondary, semantic colors (success/warning/error/info), trust-level colors (basic/verified/premium), urgency-level colors
- **Typography scale**: For MCP App components (constrained space) and web apps (full pages)
- **Spacing system**: Base unit, scale
- **Iconography**: What icon library, what custom icons are needed (trade icons, verification badges, urgency indicators)
- **Motion/Animation principles**: For MCP App transitions (loading → results, collapsed → expanded)
- **Trust indicators**: How verification, licensing, and insurance are communicated visually — this is the most important visual system in the product
- **Component library scope**: List every reusable component needed to build all screens

### 1.6 Content Design
Write the actual copy for:
- Service Request Summary confirmations (5 examples across different trades and urgency levels)
- Provider Match Card template copy (field labels, CTAs, empty states)
- Home Profile progressive questions (the exact sequence of 10 questions, with conversational framing)
- Error messages (provider not found, service area not covered, data temporarily unavailable)
- Onboarding copy for first-time homeowner users
- Provider outreach email template ("You've been recommended X times")
- Follow-up prompts (post-service rating request, preference update, maintenance reminder)

### 1.7 Metrics-Driven Design Decisions
For each major design decision, state:
- The decision
- The hypothesis behind it
- The metric that will validate or invalidate it
- The alternative you'd switch to if the metric says you're wrong

Examples:
- "We show 3 providers, not 5 or 10" — hypothesis: fewer choices increase contact rate. Metric: A/B test contact rate at 3 vs. 5 results. Alternative: show 5 with a "Best Match" highlight.
- "We show license verification before ratings" — hypothesis: trust drives action more than social proof. Metric: eye-tracking or click-through patterns. Alternative: lead with star rating if trust badge doesn't move the needle.

---

## DELIVERABLE 2: TECHNICAL ARCHITECTURE SPECIFICATION

### 2.1 Architecture Philosophy
State the 3–5 architectural principles that govern every technical decision. Each should be opinionated and specific to Stoop's constraints (3-person team, pre-seed budget, speed-to-market priority).

Examples of the level of specificity expected:
- "We use managed services everywhere. We are not in the business of operating databases, managing Kubernetes clusters, or patching servers. If Supabase or Cloudflare offers it as a managed service, we use it. We trade cost efficiency for operational simplicity."
- "We optimize for iteration speed, not performance. If a Cloudflare Worker takes 200ms instead of 50ms because we used a simpler approach, that's fine. We optimize when metrics tell us to, not before."

### 2.2 System Architecture Diagram (Described)
Describe the complete system architecture in enough detail that an engineer could draw it as a diagram. Use this format:

```
[Component Name]
  - Technology: specific tech choice
  - Responsibility: what it does
  - Connects to: [other components] via [protocol/method]
  - Data flow: what data goes in, what comes out
  - Scaling consideration: what changes at 10x load
```

Cover every component:
- MCP Server (Cloudflare Workers)
- Provider Data Pipeline (ingestion, processing, storage)
- Matching Engine (LLM-powered intent parsing + ranking)
- MCP App UI Renderer
- Homeowner Web App
- Provider Web App
- Authentication System
- Analytics Pipeline
- Background Job System
- External API Integrations (Google Places, Yelp, State DBPR, Insurance)

### 2.3 MCP Server Implementation
This is the most critical technical component. Specify:

**Server Configuration**
- MCP SDK version and setup
- Transport protocol (stdio vs HTTP/SSE vs Streamable HTTP)
- Authentication and authorization model
- Rate limiting strategy
- Error handling and retry logic

**Tool Definitions (Full Schema)**
For each tool (service_search, provider_profile, home_profile, job_history), provide:
- Complete JSON Schema for input parameters
- Complete JSON Schema for output
- Prompt/description that helps the AI host invoke the tool correctly
- Example invocations (what the AI sends, what Stoop returns)
- Edge cases and error responses

**MCP App Component Integration**
- How UI components are returned from the MCP server
- The rendering pipeline (server returns React bundle reference → AI host renders)
- Component versioning strategy
- Testing approach for MCP App components across different AI hosts

### 2.4 Data Model (Complete Schema)
Define every database table/collection with fields, types, relationships, and indexes:

- `users` (homeowner accounts)
- `home_profiles` (property details, JSONB)
- `providers` (aggregated provider data)
- `provider_verifications` (license status, insurance status, timestamps)
- `service_requests` (search/match events)
- `matches` (provider matches generated)
- `contacts` (contact initiations)
- `bookings` (confirmed jobs)
- `reviews` (post-service ratings)
- `provider_subscriptions` (billing and tier data)
- `homeowner_subscriptions`
- `analytics_events` (search, match, contact, booking funnel)

For each table: primary key, foreign keys, indexes needed for common queries, JSONB fields and their expected structure, data retention policy.

### 2.5 Provider Data Pipeline
Architect the complete data ingestion and processing pipeline:

**Data Sources**
- Google Places API: what endpoints, what fields, rate limits, cost per query, caching strategy
- Yelp Fusion API: what endpoints, what fields, rate limits, daily call budget, caching strategy
- Florida DBPR: scraping approach, data fields extracted, refresh frequency, error handling for site changes
- Insurance Verification APIs: which provider(s), cost model, verification caching

**Pipeline Architecture**
- Ingestion: scheduled jobs (frequency per source), incremental vs. full refresh
- Processing: data normalization, deduplication (same provider across Google + Yelp), field mapping
- Storage: how provider data is structured for fast retrieval during matching
- Freshness: how stale is acceptable per data type? License status (24hr max), reviews (7 days), hours (7 days)
- Monitoring: how do you know when a data source fails or degrades?

### 2.6 Matching Engine Design
The matching engine is the brain of the product. Specify:

**Intent Parsing**
- LLM model and version used (e.g., Claude 4 Sonnet)
- System prompt for intent extraction (write the actual prompt)
- Structured output format (the JSON schema the LLM returns)
- Fallback parsing (what happens if LLM fails or returns malformed output?)
- Latency budget (what's the P95 acceptable time for intent parsing?)

**Provider Ranking**
- Phase 1: Heuristic ranking algorithm (specify the formula with weighted factors)
- Weights: license_verified (0.3), rating (0.2), review_count (0.15), proximity (0.15), availability (0.1), price_match (0.1)
- How weights change based on urgency level (emergency vs. planned)
- Phase 2+: ML-based ranking — training data source, model type, feature set
- Ranking transparency: can the user see WHY a provider was ranked #1?

**RAG Architecture**
- How provider data is injected into the LLM context
- Context window management (what happens when there are 200 providers in the area?)
- Prompt structure: system prompt + provider data + user query + output format
- Write the actual system prompt used for matching (full text)

### 2.7 API Design
Define every API endpoint across all surfaces:

**MCP Server Tools** (already covered in 2.3 but include OpenAPI-style specs)

**Homeowner Web App API**
- Authentication endpoints
- Home profile CRUD
- Service history retrieval
- Provider saved/favorited
- Subscription management

**Provider Dashboard API**
- Authentication endpoints
- Lead feed (paginated, filterable)
- Profile management
- Analytics (match count, contact count, conversion rate, time period filters)
- Subscription management

**B2B API (Phase 3, but design now)**
- Authentication (API key + OAuth)
- Bulk matching endpoint
- Webhook configuration for match notifications
- Usage metering

For each endpoint: HTTP method, path, request schema, response schema, error codes, rate limits, authentication requirements.

### 2.8 Infrastructure & DevOps
Specify the complete deployment and operations setup:

- **CI/CD**: GitHub Actions workflow (what runs on PR, what runs on merge to main)
- **Environments**: local development, staging, production — what's different about each
- **Deployment**: how code goes from merged PR to live MCP server (Cloudflare Workers deployment, Vercel deployment for web apps)
- **Monitoring**: what is monitored, what alerts exist, where do alerts go
- **Logging**: structured logging format, log aggregation (Cloudflare analytics, PostHog, or custom)
- **Secret management**: how API keys, database credentials, and LLM API keys are stored and rotated
- **Disaster recovery**: what's the backup strategy? What's the worst-case recovery time?
- **Cost monitoring**: how do you catch unexpected API cost spikes (e.g., LLM inference runaway)

### 2.9 Third-Party API Budget & Risk Management
For every external API dependency:

| API | Monthly Budget | Rate Limit | Fallback if Unavailable | Cost Containment Strategy |
|-----|---------------|------------|------------------------|--------------------------|

Include: Google Places, Yelp Fusion, Claude API (Sonnet), Florida DBPR scraper, insurance verification APIs, Supabase, Cloudflare, PostHog, Stripe (for subscriptions).

### 2.10 Security Architecture
- Authentication: Supabase Auth specifics (OAuth providers, session management, token refresh)
- Authorization: RBAC model (homeowner vs. provider vs. admin roles)
- Data encryption: at rest (Supabase defaults), in transit (TLS configuration)
- PII handling: what user data touches the LLM, what doesn't, how is it anonymized
- CCPA compliance: data export, deletion, and opt-out implementation
- API security: rate limiting, input validation, SQL injection prevention
- MCP-specific security: how do you prevent prompt injection through service request fields?

### 2.11 Development Roadmap (Sprint-Level)
Break the first 12 weeks (Phase 1) into 2-week sprints. For each sprint:

| Sprint | Dates | Goals | Deliverables | Definition of Done |
|--------|-------|-------|-------------|-------------------|

Be specific. "Build the matching engine" is not a sprint goal. "Intent parser handles 15 service categories with >90% accuracy on test set of 200 queries" is a sprint goal.

### 2.12 Technical Decision Log
For each major technical choice, document:
- **Decision**: what was chosen
- **Alternatives considered**: what else was on the table
- **Why this choice**: the specific reason (cost, speed, team expertise, ecosystem fit)
- **Risks**: what could go wrong with this choice
- **Revisit trigger**: what would make you reconsider (e.g., "if Cloudflare Workers cold start latency exceeds 500ms P95, evaluate Fly.io")

Cover at minimum:
- Cloudflare Workers vs. AWS Lambda vs. Fly.io vs. Railway
- Supabase vs. PlanetScale vs. Neon vs. Firebase
- Claude Sonnet vs. GPT-4o vs. open-source models for matching
- React for MCP Apps vs. Svelte vs. vanilla HTML
- Next.js vs. Remix vs. Astro for web apps
- PostHog vs. Mixpanel vs. Amplitude for analytics
- Stripe vs. Paddle vs. LemonSqueezy for subscriptions

---

## FORMATTING & STYLE INSTRUCTIONS

- Be extremely specific and opinionated. "Use Tailwind" is not helpful. "Use Tailwind v4 with a custom design token file that maps our color system to CSS variables, configured in the Cloudflare Pages build step" is helpful.
- Write actual code snippets where they clarify the architecture (e.g., the MCP tool schema, the database migration, the system prompt for matching).
- Include actual copy, actual prompts, actual schema definitions — not placeholders.
- Use tables for structured comparisons and specifications.
- Use numbered lists for sequential processes.
- Use prose for design rationale and architectural reasoning.
- Be honest about what's overengineered for Phase 1 vs. what's essential. Mark anything that should be deferred with "[DEFER TO PHASE 2]" and explain why.
- Target total length: 30–50 pages. Comprehensive enough to start building, concise enough to be read.
- Create this as a .docx file with professional formatting.

---

## CRITICAL CONSTRAINTS TO HONOR

- **Team**: 3 engineers. Every architectural decision must be maintainable by 3 people.
- **Budget**: $100–600/month for all infrastructure and APIs combined.
- **Timeline**: Working MCP server on Claude within 8 weeks. Full Phase 1 in 12 weeks.
- **First Metro**: Miami, FL. HVAC and Plumbing only.
- **First Platform**: Claude MCP. ChatGPT expansion in Phase 2.
- **No premature optimization**: Don't build for 100K users when we need to serve 500.
- **No vanity architecture**: Don't use Kubernetes when a single Cloudflare Worker will do. Don't use a message queue when a cron job works. Don't add Redis when Supabase's built-in caching is sufficient.
- **Ship ugly, ship fast**: The first MCP App cards can be visually simple as long as they're informationally complete. Polish comes after validation.

---

## PRESSURE-TEST EVERY SECTION

Before finalizing each section, verify:

□ **Could I build this tomorrow?** Is there enough specificity that an engineer could open their IDE and start?
□ **Does this serve 3 people?** Would a team of 3 actually maintain this, or did I design for a team of 20?
□ **Is this the simplest thing that works?** Am I adding complexity because it's interesting, or because it's necessary?
□ **What would I cut?** If we only had 6 weeks instead of 12, which pieces of this design would I drop first?
□ **Where are the unknowns?** What in this design requires experimentation vs. execution? Flag them explicitly.
