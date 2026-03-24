import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ContactButton } from "../ContactButton";

describe("ContactButton", () => {
  const defaultProps = {
    phone: "+15551234567",
    providerName: "Mike's Plumbing",
    serviceType: "plumbing",
    urgency: "soon" as const,
  };

  it("renders Call and Text buttons", () => {
    render(<ContactButton {...defaultProps} />);
    expect(screen.getByText(/Call/)).toBeInTheDocument();
    expect(screen.getByText(/Text/)).toBeInTheDocument();
  });

  it("Call button has tel: href", () => {
    render(<ContactButton {...defaultProps} />);
    const callLink = screen.getByRole("link", { name: /Call/ });
    expect(callLink).toHaveAttribute("href", "tel:+15551234567");
  });

  it("Text button has sms: href with encoded body containing provider name and service type", () => {
    render(<ContactButton {...defaultProps} />);
    const textLink = screen.getByRole("link", { name: /Text/ });
    const href = textLink.getAttribute("href")!;
    expect(href).toContain("sms:+15551234567?body=");
    const body = decodeURIComponent(href.split("?body=")[1]);
    expect(body).toContain("Mike's Plumbing");
    expect(body).toContain("plumbing");
    expect(body).toContain("soon");
  });

  it("returns null when phone is null", () => {
    const { container } = render(<ContactButton {...defaultProps} phone={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("encodes urgency in the SMS body", () => {
    render(<ContactButton {...defaultProps} urgency="emergency" />);
    const textLink = screen.getByRole("link", { name: /Text/ });
    const href = textLink.getAttribute("href")!;
    const body = decodeURIComponent(href.split("?body=")[1]);
    expect(body).toContain("emergency");
  });
});
