import React from "react";
import { colors, spacing } from "./design-tokens";

export interface TrustBadgeProps {
  licenseStatus: "active" | "inactive" | "pending";
  licenseNumber?: string | null;
}

export function TrustBadge({ licenseStatus, licenseNumber }: TrustBadgeProps) {
  if (licenseStatus === "active") {
    return (
      <span
        role="status"
        style={{
          display: "inline-block",
          padding: `${spacing.xs}px ${spacing.sm}px`,
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
          backgroundColor: colors.trustVerified,
          color: "#FFFFFF",
        }}
      >
        {"Licensed"}{licenseNumber ? ` \u2014 ${licenseNumber}` : ""}
      </span>
    );
  }

  const label =
    licenseStatus === "pending" ? "License check pending" : "Unverified";

  return (
    <span
      role="status"
      style={{
        display: "inline-block",
        padding: `${spacing.xs}px ${spacing.sm}px`,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: colors.trustUnverified,
        color: "#FFFFFF",
      }}
    >
      {label}
    </span>
  );
}
