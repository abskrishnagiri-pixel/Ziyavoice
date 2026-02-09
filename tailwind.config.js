/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a73e8', // Google Blue
          dark: '#1557b0',
          light: '#4285f4',
        },
        secondary: {
          DEFAULT: '#e8f0fe', // Light blue background
          dark: '#d2e3fc',
        },
        darkbg: {
          DEFAULT: '#202124', // Google Dark Grey
          light: '#303134',   // Lighter surface
          lighter: '#3c4043',
        },
        lightbg: {
          DEFAULT: '#f8f9fa', // Google Light Grey
          dark: '#dadce0',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#303134',
        }
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
      boxShadow: {
        'google': '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
        'google-hover': '0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)',
      }
    },
  },
  plugins: [],
};
