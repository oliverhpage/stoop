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
});
