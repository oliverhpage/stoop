# Stoop Launch Playbook — Getting to 500 Searches

**Goal:** 500 organic searches through the MCP server within 4 weeks. This validates the core thesis: people will use AI assistants to find contractors.

**Strategy:** Seed every community where MCP users and Miami homeowners overlap. Be genuine, not spammy. Lead with the problem, not the product.

---

## Week 1: MCP & AI Developer Communities (Days 1–3)

These people already have Claude Desktop and know what MCP is. Lowest friction to adoption.

### Reddit

**r/ClaudeAI** (~150K members)
Post title: "I built the first home services MCP server — ask Claude for a plumber and get 3 licensed providers"

Body:
> I've been frustrated that AI assistants give great advice about home repairs but can't actually connect you to anyone. So I built Stoop — an MCP server that turns "I need a plumber in Miami" into 3 licensed, rated contractors with phone numbers.
>
> It checks every provider against the Florida DBPR license database, pulls ratings from Google and Yelp, and ranks by proximity + reviews + license status. Emergency requests get prioritized differently than planned maintenance.
>
> Right now it covers Miami metro (HVAC, plumbing, electrical — 600+ providers). Setup takes 2 minutes: [link to GitHub README]
>
> It's open source, published on the MCP Registry, and free to use. Would love feedback — what trades/cities should I add next?

**r/LocalLLaMA** (~500K members)
Angle: Technical — how the MCP server architecture works, keyword-first intent parsing with LLM fallback to save costs.

**r/MCP** (if it exists) or **r/MachineLearning**
Angle: "First vertical MCP server for a real-world service industry"

### Discord

**Anthropic Discord** (claude channel)
Share a demo: screenshot of Claude returning real providers. Brief description + setup link.

**MCP Discord** (if exists)
Post in #showcase or equivalent.

### Hacker News

**Show HN: Stoop — MCP server that finds licensed contractors through AI assistants**

> Ask Claude "I need a plumber in Miami" and get 3 licensed providers with ratings, pricing, and phone numbers — all verified against the Florida state license database.
>
> The home services industry is $650B but still acquired through Google search and word-of-mouth. AI assistants are becoming the new front door, but they can't connect you to anyone. MCP changes that.
>
> Technical details: Cloudflare Workers + Supabase PostGIS + keyword-first intent parsing (80% of queries skip the LLM entirely). Open source.
>
> [https://github.com/oliverhpage/stoop](https://github.com/oliverhpage/stoop)

Best time to post: Tuesday–Thursday, 8–9am ET.

---

## Week 1: Miami Homeowner Communities (Days 3–5)

These people have the problem but may not know about MCP. Lead with the pain point.

### Reddit

**r/Miami** (~300K members)
Post title: "I built a free tool that finds licensed plumbers/electricians/HVAC techs in Miami — checks them against the state license database"

Body:
> Got tired of the Google → call 5 numbers → 3 voicemails → overpay cycle. Built something that searches 600+ licensed providers in Miami-Dade and Broward, checks their Florida license status, and shows you the 3 best matches with phone numbers.
>
> Works inside Claude (the AI assistant). You just describe what you need: "AC not cooling," "faucet leaking," "outlet sparking" — and it finds licensed contractors near you.
>
> Currently covers HVAC, plumbing, and electrical. Free. No ads. No lead selling. Just the info.
>
> Setup: [link to README]
>
> Happy to add other trades if there's interest. What's hardest to find in Miami?

**r/homeowners** (~200K members)
Similar angle but more general. Emphasize the license verification — "you're letting a stranger into your home."

**r/HomeImprovement** (~5M members)
Angle: "I built a tool that checks contractor licenses automatically"

### Facebook Groups

- "Miami Homeowners" groups
- "Coral Gables Community" groups
- "South Florida Home Repair" groups

Same framing: free tool, checks licenses, no ads. Link to setup instructions.

### Nextdoor

Post in your Miami neighborhood. Nextdoor is where people already ask for contractor recommendations.

---

## Week 2: Content & SEO (Days 7–10)

### Blog Post / Medium Article

"Why Your AI Assistant Can't Find You a Plumber (And How MCP Fixes That)"

Outline:
1. The broken contractor discovery process
2. AI assistants are great at advice, terrible at action
3. MCP — the protocol that connects AI to real-world services
4. How Stoop works (architecture diagram)
5. Demo walkthrough with screenshots
6. What's next

Publish on Medium, cross-post to dev.to and Hashnode.

### Twitter/X Thread

Thread: "I built the first MCP server for home services 🏠🔧"

1. The problem (AI can't find contractors)
2. The solution (MCP server with real data)
3. Demo screenshot
4. How ranking works
5. How to set it up (2 min)
6. What's next + link

Tag: @AnthropicAI, @alexalbert__, @modelaboratory. Use #MCP #AI #BuildInPublic

### LinkedIn Post

Professional angle: "The $650B home services industry has zero AI infrastructure. I'm building it."

Good for reaching property managers, real estate agents, home warranty companies (future B2B leads).

---

## Week 2: Direct Outreach (Days 10–14)

### MCP Newsletter / Blogs

- Email MCP-focused newsletters and blogs about Stoop
- Offer to write a guest post about building a vertical MCP server

### Anthropic Team

- Email the MCP team at Anthropic (find on LinkedIn)
- Ask to be featured in their MCP showcase or connector directory
- You're the first home services MCP server — that's newsworthy for them

### YouTube / Video

- Record a 2-minute demo: "Watch me find a licensed plumber in Miami using Claude"
- Post on YouTube, embed in Reddit/HN posts
- People trust video demos more than text descriptions

---

## Week 3–4: Measure & Iterate

### Daily Check

```sql
SELECT DATE(created_at) as day,
       COUNT(*) FILTER (WHERE event_type = 'search_initiated') as searches,
       COUNT(*) FILTER (WHERE event_type = 'contact_initiated') as contacts
FROM analytics_events
GROUP BY DATE(created_at)
ORDER BY day DESC;
```

### Weekly Metrics

| Metric | Target | Action if Below |
|--------|--------|----------------|
| Daily searches | 25+ | Post in new communities |
| Weekly searches | 125+ | On track for 500/month |
| Contact rate | 15%+ | Improve ranking or card UX |
| Return users | 30%+ | Ring 2 justified |

### Feedback Loop

- Monitor GitHub issues for feature requests
- Check which trades/cities people ask about most (from search queries)
- Respond to every comment on every post

---

## Post Templates (Copy/Paste Ready)

### Short Description (for bios, profiles, headers)
> Stoop — find licensed contractors through your AI assistant. Ask Claude for a plumber and get 3 verified providers in seconds.

### One-Liner (for comments, replies)
> I built an MCP server that finds licensed plumbers/HVAC/electricians in Miami through Claude. Free, open source: github.com/oliverhpage/stoop

### Setup Instructions (for sharing)
> Add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):
> ```json
> {"mcpServers":{"stoop":{"command":"npx","args":["mcp-remote","https://stoop-mcp-server.stoop.workers.dev/mcp"]}}}
> ```
> Restart Claude Desktop. Try: "I need a plumber in Miami"

---

## What NOT To Do

- Don't spam. One post per community. Engage in comments.
- Don't oversell. It's Miami-only, 3 trades. Be honest about limitations.
- Don't buy ads yet. Organic first. Ads after product-market fit.
- Don't post everywhere on the same day. Spread across 2 weeks.
- Don't ignore negative feedback. Every complaint is a feature request.
