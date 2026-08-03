/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--dastor-ink)",
        carbon: "var(--dastor-carbon)",
        graphite: "var(--dastor-graphite)",
        paper: "var(--dastor-paper)",
        "paper-muted": "var(--dastor-paper-muted)",
        signal: "var(--dastor-signal)",
        "text-light": "var(--dastor-text-light)",
        "text-muted": "var(--dastor-text-muted)",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        measure: "68ch",
      },
    },
  },
  plugins: [],
};
