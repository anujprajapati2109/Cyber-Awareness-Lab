/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/renderer/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#020403",
        panel: "rgba(7, 18, 20, 0.72)",
        cyber: "#25f39b",
        signal: "#38bdf8",
        warning: "#f8d66d",
        danger: "#fb7185"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Consolas", "monospace"]
      },
      boxShadow: {
        glow: "0 0 34px rgba(37, 243, 155, 0.18)",
        blueglow: "0 0 34px rgba(56, 189, 248, 0.14)"
      }
    }
  },
  plugins: []
};
