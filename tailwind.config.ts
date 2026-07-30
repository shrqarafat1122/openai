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
        accent: "#4f7cff",
      },
    },
  },
  plugins: [],
} satisfies Config;
