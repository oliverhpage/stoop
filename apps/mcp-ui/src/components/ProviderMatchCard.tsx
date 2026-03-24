import React from "react";
import type { ProviderMatch } from "@stoop/shared";
import { TrustBadge } from "../shared/TrustBadge";
import { ContactButton } from "./ContactButton";
import { colors, spacing } from "../shared/design-tokens";

export interface ProviderMatchCardProps {
  provider: ProviderMatch;
  urgency?: "emergency" | "soon" | "planned";
}

function getPhone(provider: ProviderMatch): string | null {
  const phone = provider.contact_methods.find(
    (m) => m.type === "phone" || m.type === "sms",
  );
  return phone?.value ?? null;
}

function formatPriceRange(range: ProviderMatch["price_range"]): string {
  if (!range) return "Contact for quote";
  return `$${range.low}\u2013$${range.high}`;
}

export function ProviderMatchCard({ provider, urgency = "planned" }: ProviderMatchCardProps) {
  const phone = getPhone(provider);

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

      <ContactButton
        phone={phone}
        providerName={provider.name}
        serviceType={provider.trade_category}
        urgency={urgency}
      />
    </div>
  );
}
