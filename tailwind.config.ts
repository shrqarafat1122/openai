import type { Config } from "tailwindcss";
import { join } from "path";

// Absolute globs (anchored to this config's folder) so Tailwind scans the right
// files even when the dev server is launched from a parent directory.
export default {
  content: [
    join(__dirname, "app/**/*.{js,ts,jsx,tsx,mdx}"),
    join(__dirname, "components/**/*.{js,ts,jsx,tsx,mdx}"),
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b0d10",
        surface: "#14181d",
        border: "#232a31",
        // Premium violet accent (was flat blue). Object form so both
        // `accent`/`bg-accent` and the `accent-600` hover shade resolve.
        accent: { DEFAULT: "#7c5cff", 600: "#6d4aff" },
        // Off-scale shades referenced across the redesign. Extending
        // `indigo`/`zinc` merges with Tailwind's defaults — standard shades
        // (indigo-600, zinc-800, …) keep working.
        indigo: { 650: "#4841d6" },
        zinc: {
          150: "#ececee",
          350: "#b8b8bf",
          405: "#9d9da5",
          450: "#898992",
          550: "#61616b",
          650: "#48484f",
          850: "#1f1f22",
        },
      },
      spacing: {
        "4.5": "1.125rem",
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-blue': '0 0 20px rgba(79, 124, 255, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
