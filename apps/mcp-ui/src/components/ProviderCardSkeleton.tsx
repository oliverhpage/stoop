import React from "react";
import { colors, spacing } from "../shared/design-tokens";

export interface ProviderCardSkeletonProps {
  count?: number;
}

const PLACEHOLDER_COLOR = "#E5E7EB";
const PLACEHOLDER_RADIUS = 6;

function PlaceholderBar({
  width,
  height,
}: {
  width: string;
  height: number;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: PLACEHOLDER_RADIUS,
        backgroundColor: PLACEHOLDER_COLOR,
      }}
    />
  );
}

export function ProviderCardSkeleton({ count = 3 }: ProviderCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          data-testid="skeleton-card"
          style={{
            backgroundColor: colors.surfaceCard,
            border: `1px solid ${colors.borderDefault}`,
            borderRadius: 12,
            padding: spacing.base,
            display: "flex",
            flexDirection: "column",
            gap: spacing.sm,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        >
          {/* Name placeholder */}
          <PlaceholderBar width="60%" height={16} />
          {/* Trade badge placeholder */}
          <PlaceholderBar width="80px" height={12} />
          {/* License badge placeholder */}
          <PlaceholderBar width="50%" height={14} />
          {/* Rating placeholder */}
          <PlaceholderBar width="40%" height={14} />
          {/* Price placeholder */}
          <PlaceholderBar width="45%" height={14} />
          {/* Button placeholder */}
          <div
            style={{
              width: "100%",
              height: 40,
              borderRadius: PLACEHOLDER_RADIUS,
              backgroundColor: PLACEHOLDER_COLOR,
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1.0; }
        }
      `}</style>
    </>
  );
}
