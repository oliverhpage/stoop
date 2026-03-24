import React from "react";
import type { ProviderMatch } from "@stoop/shared";
import { TrustBadge } from "../shared/TrustBadge";
import { TradeIcon } from "../shared/trade-icons";
import { ContactButton } from "./ContactButton";
import { colors, spacing } from "../shared/design-tokens";

export interface ProviderMatchCardProps {
  provider: ProviderMatch;
  urgency?: "emergency" | "soon" | "planned";
  expanded?: boolean;
  license_type?: string;
  license_expiry?: string;
  hours_today?: string;
  data_freshness_at?: string;
}

function getPhone(provider: ProviderMatch): string | null {
  const phone = provider.contact_methods.find(
    (m) => m.type === "phone" || m.type === "sms",
  );
  return phone?.value ?? null;
}

function getDaysAgo(isoDate: string): number {
  const then = new Date(isoDate);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

function formatPriceRange(range: ProviderMatch["price_range"]): string {
  if (!range) return "Contact for quote";
  return `$${range.low}\u2013$${range.high}`;
}

export function ProviderMatchCard({
  provider,
  urgency = "planned",
  expanded = false,
  license_type,
  license_expiry,
  hours_today,
  data_freshness_at,
}: ProviderMatchCardProps) {
  const phone = getPhone(provider);

  const staleWarning = (() => {
    if (!data_freshness_at) return null;
    const days = getDaysAgo(data_freshness_at);
    if (days <= 7) return null;
    return `Last updated ${days} days ago`;
  })();

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
          display: "inline-flex",
          alignItems: "center",
          alignSelf: "flex-start",
          gap: 4,
          padding: `${spacing.xs}px ${spacing.sm}px`,
          borderRadius: 999,
          fontSize: 12,
          color: colors.textMuted,
          backgroundColor: colors.surfaceBg,
        }}
      >
        <TradeIcon trade={provider.trade_category} size={14} />
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

      {expanded && (
        <div
          style={{
            borderTop: `1px solid ${colors.borderDefault}`,
            paddingTop: spacing.sm,
            display: "flex",
            flexDirection: "column",
            gap: spacing.xs,
            fontSize: 13,
            color: colors.textSecondary,
          }}
        >
          {license_type && (
            <div>License Type: {license_type}</div>
          )}
          {license_expiry && (
            <div>Expires: {license_expiry}</div>
          )}

          <div>
            {hours_today
              ? `Business Hours: ${hours_today}`
              : "Hours not available"}
          </div>

          {staleWarning && (
            <div style={{ color: colors.textMuted, fontStyle: "italic" }}>
              {staleWarning}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
