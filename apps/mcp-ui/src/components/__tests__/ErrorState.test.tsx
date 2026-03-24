import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ErrorState } from "../ErrorState";

describe("ErrorState", () => {
  it("renders no-results message with category name", () => {
    render(<ErrorState type="no_results" category="plumbing" />);
    expect(
      screen.getByText(/No licensed plumbing providers found nearby/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Try expanding your search area/),
    ).toBeInTheDocument();
  });

  it("renders coming-soon message mentioning HVAC, Plumbing, Electrical", () => {
    render(<ErrorState type="coming_soon" />);
    const text = screen.getByText(/Coming soon to Miami/);
    expect(text).toBeInTheDocument();
    expect(text.textContent).toContain("HVAC");
    expect(text.textContent).toContain("Plumbing");
    expect(text.textContent).toContain("Electrical");
  });

  it("renders generic error message", () => {
    render(<ErrorState type="error" />);
    expect(
      screen.getByText(/Something went wrong/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Please try again/)).toBeInTheDocument();
  });

  it("renders no-results without category gracefully", () => {
    render(<ErrorState type="no_results" />);
    expect(
      screen.getByText(/No licensed providers found nearby/),
    ).toBeInTheDocument();
  });
});
