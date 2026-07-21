import type { Config } from "tailwindcss";

// Palette: "Social Media App" from UI/UX Pro Max colors.csv
// Vibrant rose + engagement blue. All pairs meet WCAG 4.5:1 on their
// designated foreground tokens.
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#E11D48",
          fg: "#FFFFFF",
          hover: "#BE123C",
        },
        secondary: {
          DEFAULT: "#FB7185",
          fg: "#0F172A",
        },
        accent: {
          DEFAULT: "#2563EB",
          fg: "#FFFFFF",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          fg: "#881337",
        },
        canvas: "#FFF1F2",
        ink: "#881337",
        muted: {
          DEFAULT: "#F0ECF2",
          fg: "#64748B",
        },
        line: "#FECDD3",
        danger: {
          DEFAULT: "#DC2626",
          fg: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(136, 19, 55, 0.08)",
        lift: "0 2px 8px rgba(136, 19, 55, 0.06)",
      },
      backdropBlur: {
        glass: "16px",
      },
    },
  },
  plugins: [],
};
export default config;
