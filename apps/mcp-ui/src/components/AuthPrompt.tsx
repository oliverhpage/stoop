import React from "react";
import { colors, spacing } from "../shared/design-tokens";

export interface AuthPromptProps {
  isAuthenticated?: boolean;
}

export function AuthPrompt({ isAuthenticated }: AuthPromptProps) {
  if (isAuthenticated) return null;

  return (
    <div
      style={{
        backgroundColor: "#EEF2FF",
        border: `1px solid ${colors.brandSecondary}33`,
        borderRadius: 12,
        padding: spacing.md,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.sm,
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: colors.textSecondary,
        }}
      >
        Save your preferences and service history
      </span>
      <a
        href="#signup"
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: colors.brandPrimary,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Sign Up
      </a>
    </div>
  );
}
