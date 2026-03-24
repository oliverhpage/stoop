import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AuthPrompt } from "../AuthPrompt";

describe("AuthPrompt", () => {
  it("renders sign-up prompt when not authenticated", () => {
    render(<AuthPrompt />);
    expect(
      screen.getByText(/Save your preferences and service history/),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /sign up/i });
    expect(link).toHaveAttribute("href", "#signup");
  });

  it("returns null when isAuthenticated is true", () => {
    const { container } = render(<AuthPrompt isAuthenticated />);
    expect(container.firstChild).toBeNull();
  });

  it("renders sign-up prompt when isAuthenticated is false", () => {
    render(<AuthPrompt isAuthenticated={false} />);
    expect(
      screen.getByText(/Save your preferences and service history/),
    ).toBeInTheDocument();
  });
});
