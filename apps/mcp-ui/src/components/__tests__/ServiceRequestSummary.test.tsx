import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ServiceRequestSummary } from "../ServiceRequestSummary";
import type { ParsedIntent } from "@stoop/shared";

function makeIntent(overrides: Partial<ParsedIntent> = {}): ParsedIntent {
  return {
    category: "plumbing",
    subcategory: "leak repair",
    urgency: "planned",
    timing: "next week",
    budget_max: 500,
    special_requirements: null,
    multi_service: false,
    ...overrides,
  };
}

describe("ServiceRequestSummary", () => {
  it("renders service type and urgency", () => {
    render(<ServiceRequestSummary intent={makeIntent()} />);
    expect(screen.getByText(/plumbing \/ leak repair/)).toBeInTheDocument();
    expect(screen.getAllByText(/planned/i).length).toBeGreaterThanOrEqual(1);
  });

  it("returns null for emergency urgency", () => {
    const { container } = render(
      <ServiceRequestSummary intent={makeIntent({ urgency: "emergency" })} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows green banner for planned urgency", () => {
    render(<ServiceRequestSummary intent={makeIntent({ urgency: "planned" })} />);
    const banner = screen.getByRole("banner");
    expect(banner).toHaveStyle({ backgroundColor: "#27AE60" });
  });

  it("shows yellow banner for soon urgency", () => {
    render(<ServiceRequestSummary intent={makeIntent({ urgency: "soon" })} />);
    const banner = screen.getByRole("banner");
    expect(banner).toHaveStyle({ backgroundColor: "#F39C12" });
  });

  it("shows location pill when provided", () => {
    render(
      <ServiceRequestSummary intent={makeIntent()} location="Brooklyn, NY" />,
    );
    expect(screen.getByText(/Brooklyn, NY/)).toBeInTheDocument();
  });

  it("shows budget pill", () => {
    render(<ServiceRequestSummary intent={makeIntent({ budget_max: 500 })} />);
    expect(screen.getByText(/\$500/)).toBeInTheDocument();
  });
});
