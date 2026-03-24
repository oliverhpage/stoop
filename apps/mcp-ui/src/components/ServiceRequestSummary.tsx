import React from "react";
import type { ParsedIntent } from "@stoop/shared";
import { colors, spacing } from "../shared/design-tokens";

export interface ServiceRequestSummaryProps {
  intent: ParsedIntent;
  location?: string;
}

const urgencyColorMap = {
  emergency: colors.urgencyEmergency,
  soon: colors.urgencySoon,
  planned: colors.urgencyPlanned,
} as const;

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: `${spacing.xs}px ${spacing.sm}px`,
        borderRadius: 999,
        fontSize: 12,
        backgroundColor: colors.surfaceBg,
        color: colors.textSecondary,
        marginRight: spacing.xs,
        marginBottom: spacing.xs,
      }}
    >
      <strong>{label}:</strong> {value}
    </span>
  );
}

export function ServiceRequestSummary({
  intent,
  location,
}: ServiceRequestSummaryProps) {
  if (intent.urgency === "emergency") {
    return null;
  }

  const bannerColor = urgencyColorMap[intent.urgency];

  return (
    <div
      style={{
        backgroundColor: colors.surfaceCard,
        border: `1px solid ${colors.borderDefault}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        role="banner"
        style={{
          backgroundColor: bannerColor,
          color: "#FFFFFF",
          padding: `${spacing.sm}px ${spacing.base}px`,
          fontSize: 13,
          fontWeight: 600,
          textTransform: "capitalize",
        }}
      >
        {intent.urgency}
      </div>

      <div
        style={{
          padding: spacing.base,
          display: "flex",
          flexWrap: "wrap",
          gap: spacing.xs,
        }}
      >
        <Pill label="Service" value={`${intent.category} / ${intent.subcategory}`} />
        {location && <Pill label="Location" value={location} />}
        <Pill label="Urgency" value={intent.urgency} />
        {intent.budget_max != null && (
          <Pill label="Budget" value={`$${intent.budget_max}`} />
        )}
        <Pill label="Timing" value={intent.timing} />
      </div>
    </div>
  );
}
