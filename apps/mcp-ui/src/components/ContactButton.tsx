import React from "react";
import { colors, spacing } from "../shared/design-tokens";

export interface ContactButtonProps {
  phone: string | null;
  providerName: string;
  serviceType: string;
  urgency: "emergency" | "soon" | "planned";
}

function buildSmsBody(providerName: string, serviceType: string, urgency: string): string {
  return `Hi ${providerName}, I found you on Stoop. I'm looking for ${serviceType} (${urgency}). Are you available?`;
}

export function ContactButton({ phone, providerName, serviceType, urgency }: ContactButtonProps) {
  if (!phone) return null;

  const smsBody = encodeURIComponent(buildSmsBody(providerName, serviceType, urgency));

  return (
    <div style={{ display: "flex", gap: spacing.sm }}>
      <a
        href={`tel:${phone}`}
        style={{
          flex: 1,
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
        {"\uD83D\uDCDE"} Call
      </a>
      <a
        href={`sms:${phone}?body=${smsBody}`}
        style={{
          flex: 1,
          display: "inline-block",
          textAlign: "center",
          padding: `${spacing.sm}px ${spacing.base}px`,
          borderRadius: 8,
          backgroundColor: "transparent",
          color: colors.brandPrimary,
          fontWeight: 600,
          fontSize: 14,
          textDecoration: "none",
          border: `2px solid ${colors.brandPrimary}`,
        }}
      >
        {"\uD83D\uDCAC"} Text
      </a>
    </div>
  );
}
