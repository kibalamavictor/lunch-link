import type { Config } from "tailwindcss";

/**
 * LunchLink design tokens — see docs/design-system.md
 */
export const lunchLinkPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        sm: "12px",
        md: "20px",
        lg: "28px",
        xl: "36px",
      },
      boxShadow: {
        card: "0 4px 12px rgba(0, 0, 0, 0.06)",
        modal: "0 12px 32px rgba(0, 0, 0, 0.12)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "1.1", fontWeight: "800" }],
        "display-md": ["36px", { lineHeight: "1.15", fontWeight: "700" }],
        "display-sm": ["24px", { lineHeight: "1.2", fontWeight: "700" }],
      },
      transitionDuration: {
        fast: "150ms",
        DEFAULT: "250ms",
        slow: "350ms",
      },
    },
  },
};

export default lunchLinkPreset;
