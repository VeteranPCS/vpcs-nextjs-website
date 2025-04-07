import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#292F6C',
          hover: '#4E5489',
          light: '#9599b3',
          lighter: '#aeb0c7',
          gradient: 'linear-gradient(233deg, #2A2F6C 28.37%, #555CA4 95.18%), #D9D9D9',
        },
        accent: {
          red: {
            DEFAULT: '#a81f23',
            dark: '#7e1618',
            light: '#d22230',
            hover: '#871B1C',
          },
          blue: {
            DEFAULT: '#003486',
            light: '#2ea3f2',
          },
        },
        text: {
          white: '#FFFFFF',
          black: '#000000',
          dark: '#333333',
          gray: '#666666',
        },
        spinner: '#3498db',
      },
      fontFamily: {
        inter: ['var(--font-inter)'],
        poppins: ['var(--font-poppins)'],
        roboto: ['var(--font-roboto)'],
        lora: ['var(--font-lora)'],
        tahoma: ['tahoma', 'sans-serif'],
      },
      boxShadow: {
        'header': '0 12px 18px -6px rgba(0, 0, 0, 0.3)',
        'nav': '0 2px 5px rgba(0, 0, 0, 0.1)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-custom': 'linear-gradient(233deg, #5a72ea 28.37%, #8468b1 95.18), #d9d9d9',
        'gradient-primary': 'linear-gradient(233deg, #2A2F6C 28.37%, #555CA4 95.18%), #D9D9D9',
      },
      zIndex: {
        'nav': '9999',
        'loader': '1000',
      },
      transitionProperty: {
        'visibility': 'visibility, opacity',
        'all': 'all',
      },
      transitionDuration: {
        '450': '450ms',
        '300': '300ms',
      },
      fontSize: {
        'marker': '1.5rem',
        'hero': ['59px', { lineHeight: '1.3' }],
        'hero-md': ['29px', { lineHeight: '1.3' }],
        'hero-sm': ['40px', { lineHeight: '1.3' }],
        'hero-xs': ['40px', { lineHeight: '1.3' }],
        'title-lg': ['48px', { lineHeight: '1.2' }],
        'title-md': ['29px', { lineHeight: '1.2' }],
        'title-sm': ['25px', { lineHeight: '1.2' }],
        'title-xs': ['20px', { lineHeight: '1.2' }],
      },
      spacing: {
        'nav-submenu': '200%',
        'hero-padding': '115px',
        'hero-mobile-padding': '40px',
      },
      borderRadius: {
        'custom': '32px',
        'button': '16px',
      },
    },
  },
  plugins: [],
};

export default config;