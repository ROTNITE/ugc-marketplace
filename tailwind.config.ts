import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
      },
      fontSize: {
        "ui-xs": ["var(--text-xs)", { lineHeight: "var(--leading-xs)", letterSpacing: "var(--tracking-normal)" }],
        "ui-sm": ["var(--text-sm)", { lineHeight: "var(--leading-sm)", letterSpacing: "var(--tracking-normal)" }],
        "ui-base": ["var(--text-base)", { lineHeight: "var(--leading-base)", letterSpacing: "var(--tracking-normal)" }],
        "ui-lg": ["var(--text-lg)", { lineHeight: "var(--leading-lg)", letterSpacing: "var(--tracking-normal)" }],
        "ui-xl": ["var(--text-xl)", { lineHeight: "var(--leading-xl)", letterSpacing: "var(--tracking-tight)" }],
        "ui-2xl": ["var(--text-2xl)", { lineHeight: "var(--leading-2xl)", letterSpacing: "var(--tracking-tight)" }],
      },
      fontWeight: {
        "ui-normal": "var(--font-weight-normal)",
        "ui-medium": "var(--font-weight-medium)",
        "ui-semibold": "var(--font-weight-semibold)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".65" },
        },
      },
      animation: {
        "fade-in": "fade-in .35s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
      colors: {
        // Core tokens (mapped to CSS variables in globals.css).
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: "hsl(var(--primary) / <alpha-value>)",
        "primary-foreground": "hsl(var(--primary-foreground) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        "muted-foreground": "hsl(var(--muted-foreground) / <alpha-value>)",
        card: "hsl(var(--card) / <alpha-value>)",
        "card-foreground": "hsl(var(--card-foreground) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        "surface-foreground": "hsl(var(--surface-foreground) / <alpha-value>)",
        overlay: "hsl(var(--overlay) / <alpha-value>)",
        "overlay-foreground": "hsl(var(--overlay-foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        "border-soft": "hsl(var(--border-soft) / <alpha-value>)",
        "border-strong": "hsl(var(--border-strong) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        info: "hsl(var(--info) / <alpha-value>)",
        "info-foreground": "hsl(var(--info-foreground) / <alpha-value>)",
        success: "hsl(var(--success) / <alpha-value>)",
        "success-foreground": "hsl(var(--success-foreground) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        "warning-foreground": "hsl(var(--warning-foreground) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)",
        "danger-foreground": "hsl(var(--danger-foreground) / <alpha-value>)",
        "accent-creator": "hsl(var(--accent-creator) / <alpha-value>)",
        "accent-creator-foreground": "hsl(var(--accent-creator-foreground) / <alpha-value>)",
        "accent-brand": "hsl(var(--accent-brand) / <alpha-value>)",
        "accent-brand-foreground": "hsl(var(--accent-brand-foreground) / <alpha-value>)",
        "accent-admin": "hsl(var(--accent-admin) / <alpha-value>)",
        "accent-admin-foreground": "hsl(var(--accent-admin-foreground) / <alpha-value>)",
        glass: "hsl(var(--glass) / <alpha-value>)",
        "glass-border": "hsl(var(--glass-border) / <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      borderWidth: {
        hairline: "0.5px",
        soft: "1px",
        strong: "2px",
      },
      boxShadow: {
        subtle: "var(--shadow-subtle)",
        raised: "var(--shadow-raised)",
        elevated: "var(--shadow-elevated)",
        glow: "var(--shadow-glow)",
      },
      backgroundImage: {
        "accent": "var(--gradient-accent)",
        "mesh": "var(--gradient-mesh)",
        "stroke": "var(--gradient-stroke)",
      },
      backdropBlur: {
        glass: "var(--glass-blur)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
        emphasis: "var(--ease-emphasis)",
      },
    },
  },
  plugins: [],
};

export default config;
