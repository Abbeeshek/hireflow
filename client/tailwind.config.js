/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1A1136',
        indigo: {
          DEFAULT: '#4530A6',
          light: '#7B68E8',
          hover: '#37238B'
        },
        amber: {
          DEFAULT: '#F5A324',
          light: '#FDECD2'
        },
        lavender: {
          DEFAULT: '#CFC6F5',
          light: '#EBE7FA'
        },
        background: '#F7F6FC',
        success: {
          DEFAULT: '#1FA971',
          light: '#E2F7EE'
        },
        danger: {
          DEFAULT: '#D9534F',
          light: '#FBE8E7'
        }
      },
      fontFamily: {
        heading: ['Fraunces', 'serif'],
        sans: ['Inter', 'sans-serif']
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(26, 17, 54, 0.06), 0 2px 6px -1px rgba(26, 17, 54, 0.04)',
        hover: '0 10px 25px -3px rgba(26, 17, 54, 0.1), 0 4px 10px -2px rgba(26, 17, 54, 0.05)',
        card: '0 2px 12px rgba(69, 48, 166, 0.06)'
      },
      borderRadius: {
        card: '1rem',
        pill: '9999px'
      }
    }
  },
  plugins: []
};
