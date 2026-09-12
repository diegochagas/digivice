import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      keyframes: {
        loading: {
          '0%': { top: '8px', height: '64px' },
          '50%, 100%': { top: '24px', height: '32px' }
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' }
        }
      },
      animation: {
        loading: 'loading 1.2s cubic-bezier(0, 0.5, 0.5, 1) infinite',
        bob: 'bob 2.4s ease-in-out infinite'
      },
    },
  },
  plugins: [],
};
export default config;
