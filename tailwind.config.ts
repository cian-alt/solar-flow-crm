import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFF",
        foreground: "#0F172A",
        primary: {
          DEFAULT: "#1B3A6B",
          50: "#EEF2FA",
          100: "#D5E0F5",
          200: "#ABBFE8",
          300: "#809EDA",
          400: "#567EC7",
          500: "#2C5DB4",
          600: "#1B3A6B",
          700: "#152E55",
          800: "#0E213F",
          900: "#081428",
        },
        navy: "#1B3A6B",
        glass: "rgba(255,255,255,0.6)",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "DM Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        glass: "16px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(31,38,135,0.08)",
        "glass-sm": "0 4px 16px rgba(31,38,135,0.06)",
        "glass-lg": "0 16px 48px rgba(31,38,135,0.12)",
        card: "0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.8)",
      },
      backdropBlur: {
        glass: "20px",
      },
      animation: {
        "counter-up": "counterUp 0.6s ease-out forwards",
        shimmer: "shimmer 1.5s infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
      },
      keyframes: {
        counterUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
