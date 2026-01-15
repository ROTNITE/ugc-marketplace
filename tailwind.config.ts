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
        border: "hsl(var(--border) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        info: "hsl(var(--info) / <alpha-value>)",
        "info-foreground": "hsl(var(--info-foreground) / <alpha-value>)",
        success: "hsl(var(--success) / <alpha-value>)",
        "success-foreground": "hsl(var(--success-foreground) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        "warning-foreground": "hsl(var(--warning-foreground) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)",
        "danger-foreground": "hsl(var(--danger-foreground) / <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
