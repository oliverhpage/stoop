import React from "react";
import { colors, spacing } from "../shared/design-tokens";

export interface ErrorStateProps {
  type: "no_results" | "coming_soon" | "error";
  category?: string;
}

const iconMap = {
  no_results: "\uD83D\uDD0D", // magnifying glass
  coming_soon: "\uD83D\uDD52", // clock
  error: "\u26A0\uFE0F", // warning
} as const;

function getMessage(type: ErrorStateProps["type"], category?: string): string {
  switch (type) {
    case "no_results":
      return category
        ? `No licensed ${category} providers found nearby. Try expanding your search area or adjusting your request.`
        : "No licensed providers found nearby. Try expanding your search area or adjusting your request.";
    case "coming_soon":
      return "Coming soon to Miami \u2014 we currently cover HVAC, Plumbing, and Electrical. More trades launching soon.";
    case "error":
      return "Something went wrong. Please try again.";
  }
}

export function ErrorState({ type, category }: ErrorStateProps) {
  return (
    <div
      style={{
        backgroundColor: colors.surfaceBg,
        border: `1px solid ${colors.borderDefault}`,
        borderRadius: 12,
        padding: spacing.base,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: spacing.sm,
      }}
    >
      <span style={{ fontSize: 24 }} role="img" aria-hidden="true">
        {iconMap[type]}
      </span>
      <p
        style={{
          fontSize: 14,
          color: colors.textMuted,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {getMessage(type, category)}
      </p>
    </div>
  );
}
