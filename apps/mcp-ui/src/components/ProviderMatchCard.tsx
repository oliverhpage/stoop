import React from "react";
import type { ProviderMatch } from "@stoop/shared";
import { TrustBadge } from "../shared/TrustBadge";
import { colors, spacing } from "../shared/design-tokens";

export interface ProviderMatchCardProps {
  provider: ProviderMatch;
}

function getContactHref(provider: ProviderMatch): string | null {
  const phone = provider.contact_methods.find(
    (m) => m.type === "phone" || m.type === "sms",
  );
  if (!phone) return null;

  if (phone.type === "sms") {
    const body = encodeURIComponent(
      `Hi ${provider.name}, I found you on Stoop and would like to discuss a service request.`,
    );
    return `sms:${phone.value}?body=${body}`;
  }

  return `tel:${phone.value}`;
}

function formatPriceRange(range: ProviderMatch["price_range"]): string {
  if (!range) return "Contact for quote";
  return `$${range.low}\u2013$${range.high}`;
}

export function ProviderMatchCard({ provider }: ProviderMatchCardProps) {
  const contactHref = getContactHref(provider);

  return (
    <div
      style={{
        backgroundColor: colors.surfaceCard,
        border: `1px solid ${colors.borderDefault}`,
        borderRadius: 12,
        padding: spacing.base,
        display: "flex",
        flexDirection: "column",
        gap: spacing.sm,
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: colors.textPrimary,
        }}
      >
        {provider.name}
      </div>

      <span
        style={{
          display: "inline-block",
          alignSelf: "flex-start",
          padding: `${spacing.xs}px ${spacing.sm}px`,
          borderRadius: 999,
          fontSize: 12,
          color: colors.textMuted,
          backgroundColor: colors.surfaceBg,
        }}
      >
        {provider.trade_category}
      </span>

      <TrustBadge
        licenseStatus={provider.license_status}
        licenseNumber={provider.license_number}
      />

      <div style={{ fontSize: 14, color: colors.textSecondary }}>
        {"\u2B50"} {provider.avg_rating} ({provider.review_count} reviews)
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>
        {formatPriceRange(provider.price_range)}
      </div>

      {contactHref && (
        <a
          href={contactHref}
          style={{
            display: "inline-block",
            textAlign: "center",
            padding: `${spacing.sm}px ${spacing.base}px`,
            borderRadius: 8,
            backgroundColor: colors.brandPrimary,
            color: "#FFFFFF",
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Contact Now
        </a>
      )}
    </div>
  );
}
