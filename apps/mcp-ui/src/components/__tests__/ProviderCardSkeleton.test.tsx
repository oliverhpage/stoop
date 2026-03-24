import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProviderCardSkeleton } from "../ProviderCardSkeleton";

describe("ProviderCardSkeleton", () => {
  it("renders 3 skeleton cards by default", () => {
    render(<ProviderCardSkeleton />);
    const cards = screen.getAllByTestId("skeleton-card");
    expect(cards).toHaveLength(3);
  });

  it("renders custom count when specified", () => {
    render(<ProviderCardSkeleton count={5} />);
    const cards = screen.getAllByTestId("skeleton-card");
    expect(cards).toHaveLength(5);
  });

  it("has pulse animation style", () => {
    render(<ProviderCardSkeleton count={1} />);
    const card = screen.getByTestId("skeleton-card");
    expect(card.style.animation).toContain("pulse");
    expect(card.style.animation).toContain("1.5s");
  });
});
