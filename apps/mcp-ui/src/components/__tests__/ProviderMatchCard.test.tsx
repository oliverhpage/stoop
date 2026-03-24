import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProviderMatchCard } from "../ProviderMatchCard";
import type { ProviderMatch } from "@stoop/shared";

function makeProvider(overrides: Partial<ProviderMatch> = {}): ProviderMatch {
  return {
    provider_id: "p-1",
    name: "Mike's Plumbing",
    trade_category: "plumbing",
    license_status: "active",
    license_number: "LIC-12345",
    avg_rating: 4.8,
    review_count: 42,
    price_range: { low: 100, high: 300 },
    response_time_estimate: "30 min",
    distance_miles: 2.5,
    contact_methods: [{ type: "phone", value: "+15551234567" }],
    rank: 1,
    score: 0.95,
    ...overrides,
  };
}

describe("ProviderMatchCard", () => {
  it("renders provider name", () => {
    render(<ProviderMatchCard provider={makeProvider()} />);
    expect(screen.getByText("Mike's Plumbing")).toBeInTheDocument();
  });

  it("shows verified license badge with license number for active status", () => {
    render(<ProviderMatchCard provider={makeProvider()} />);
    expect(
      screen.getByText(/Licensed.*LIC-12345/),
    ).toBeInTheDocument();
  });

  it('shows "License check pending" for pending status', () => {
    render(
      <ProviderMatchCard
        provider={makeProvider({ license_status: "pending", license_number: null })}
      />,
    );
    expect(screen.getByText("License check pending")).toBeInTheDocument();
  });

  it("renders Call and Text contact buttons", () => {
    render(<ProviderMatchCard provider={makeProvider()} />);
    const callLink = screen.getByRole("link", { name: /Call/ });
    expect(callLink).toHaveAttribute("href", "tel:+15551234567");
    const textLink = screen.getByRole("link", { name: /Text/ });
    expect(textLink.getAttribute("href")).toContain("sms:+15551234567");
  });

  it("shows price range", () => {
    render(<ProviderMatchCard provider={makeProvider()} />);
    expect(screen.getByText("$100\u2013$300")).toBeInTheDocument();
  });

  it('shows "Contact for quote" when price_range is null', () => {
    render(
      <ProviderMatchCard provider={makeProvider({ price_range: null })} />,
    );
    expect(screen.getByText("Contact for quote")).toBeInTheDocument();
  });

  it("shows star rating with review count", () => {
    render(<ProviderMatchCard provider={makeProvider()} />);
    expect(screen.getByText(/4\.8/)).toBeInTheDocument();
    expect(screen.getByText(/42 reviews/)).toBeInTheDocument();
  });

  it("defaults to collapsed — no expanded details visible", () => {
    render(<ProviderMatchCard provider={makeProvider()} license_type="CAC" hours_today="8am–5pm" />);
    expect(screen.queryByText(/License Type/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Business Hours/)).not.toBeInTheDocument();
  });

  it("shows expanded details when expanded={true}", () => {
    render(
      <ProviderMatchCard
        provider={makeProvider()}
        expanded
        license_type="CAC"
        license_expiry="2026-12-31"
        hours_today="8am–5pm"
      />,
    );
    expect(screen.getByText("License Type: CAC")).toBeInTheDocument();
    expect(screen.getByText("Expires: 2026-12-31")).toBeInTheDocument();
    expect(screen.getByText("Business Hours: 8am–5pm")).toBeInTheDocument();
  });

  it("shows 'Hours not available' when expanded but no hours_today", () => {
    render(
      <ProviderMatchCard provider={makeProvider()} expanded />,
    );
    expect(screen.getByText("Hours not available")).toBeInTheDocument();
  });

  it("shows stale data warning when data_freshness_at is > 7 days old", () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    render(
      <ProviderMatchCard
        provider={makeProvider()}
        expanded
        data_freshness_at={thirtyDaysAgo}
      />,
    );
    expect(screen.getByText(/Last updated 30 days ago/)).toBeInTheDocument();
  });

  it("does not show stale warning when data is fresh", () => {
    const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    render(
      <ProviderMatchCard
        provider={makeProvider()}
        expanded
        data_freshness_at={yesterday}
      />,
    );
    expect(screen.queryByText(/Last updated/)).not.toBeInTheDocument();
  });
});
