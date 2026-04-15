import { addToast } from "@heroui/react";
import type { ReactNode } from "react";

type ToastColor =
  | "success"
  | "danger"
  | "warning"
  | "primary"
  | "secondary"
  | "default";

interface ShowToastOptions {
  title: string;
  description?: string;
  color?: ToastColor;
  icon?: ReactNode;
}

/**
 * Color-specific accent classes for the left border stripe
 * and subtle tinted background overlay.
 */
const colorAccents: Record<
  ToastColor,
  { border: string; bg: string; iconColor: string }
> = {
  success: {
    border: "border-l-success",
    bg: "bg-success/5",
    iconColor: "text-success",
  },
  danger: {
    border: "border-l-danger",
    bg: "bg-danger/5",
    iconColor: "text-danger",
  },
  warning: {
    border: "border-l-warning",
    bg: "bg-warning/5",
    iconColor: "text-warning",
  },
  primary: {
    border: "border-l-primary",
    bg: "bg-primary/5",
    iconColor: "text-primary",
  },
  secondary: {
    border: "border-l-secondary",
    bg: "bg-secondary/5",
    iconColor: "text-secondary",
  },
  default: {
    border: "border-l-default-400",
    bg: "bg-default/5",
    iconColor: "text-default-500",
  },
};

/**
 * Styled glass toast that matches the Waves design system.
 *
 * Renders a frosted-glass card with a colored left accent stripe,
 * clean typography, and a subtle progress bar.
 */
export function showToast({
  title,
  description,
  color = "default",
  icon,
}: ShowToastOptions) {
  const accent = colorAccents[color];

  addToast({
    title,
    description,
    color,
    variant: "flat",
    radius: "md",
    timeout: 5000,
    shouldShowTimeoutProgress: true,
    icon,
    classNames: {
      base: [
        // Glass effect
        "backdrop-blur-xl backdrop-saturate-150",
        "bg-background/70 dark:bg-content1/70",
        // Border
        "border border-white/20 dark:border-white/10",
        // Colored left stripe
        "border-l-4",
        accent.border,
        // Shadow & shape
        "shadow-lg shadow-black/5 dark:shadow-black/20",
        "rounded-xl",
        // Subtle color tint overlay
        accent.bg,
      ].join(" "),
      title: "font-semibold text-foreground text-sm",
      description: "text-default-500 text-xs mt-0.5",
      icon: `${accent.iconColor} shrink-0`,
      closeButton:
        "text-default-400 hover:text-foreground hover:bg-default-100 rounded-lg transition-colors opacity-60 hover:opacity-100",
      progressTrack: "bg-default-200/30",
      progressIndicator: accent.border.replace("border-l-", "bg-"),
    },
  });
}
