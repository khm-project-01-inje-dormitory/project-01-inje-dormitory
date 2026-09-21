import type { Config } from "tailwindcss";

/**
 * 디자인 토큰은 app/globals.css 의 CSS 변수(--*)로 정의하고,
 * Tailwind에서 아래처럼 매핑해 사용합니다. (하드코딩 금지 원칙)
 * 예) className="bg-primary text-primary-foreground rounded-card"
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
          soft: "rgb(var(--primary-soft) / <alpha-value>)",
        },
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        "card-foreground": "rgb(var(--foreground) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
      },
      borderRadius: {
        card: "var(--radius)",
        "card-lg": "calc(var(--radius) * 1.4)",
      },
      fontFamily: {
        sans: [
          '"Pretendard Variable"',
          "Pretendard",
          '-apple-system',
          'BlinkMacSystemFont',
          '"Apple SD Gothic Neo"',
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px rgb(16 12 8 / 0.06), 0 8px 24px rgb(16 12 8 / 0.06)",
        pop: "0 2px 8px rgb(16 12 8 / 0.10), 0 16px 40px rgb(16 12 8 / 0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
