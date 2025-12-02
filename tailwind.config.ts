// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // This section was kept from the first file to ensure 
      // prose paragraphs have proper spacing.
      typography: ({ theme }: { theme: any }) => ({
        DEFAULT: {
          css: {
            'p + p': {
              marginTop: theme('spacing.4'), 
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
export default config