/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                // Tam yeşil skala (Tailwind `green` ile birebir). TÜM tonlar tanımlı olmalı —
                // tanımsız ton (ör. turf-200/300/700/900) Tailwind'de no-op sınıf üretir:
                // metin renksiz kalır (portal modallarda siyah/görünmez), bg/gradyan boyanmaz.
                // Yeni ton gerekiyorsa buraya ekle; asla no-op turf sınıfı bırakma.
                turf: {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    200: '#bbf7d0',
                    300: '#86efac',
                    400: '#4ade80',
                    500: '#22c55e',
                    600: '#16a34a',
                    700: '#15803d',
                    800: '#166534',
                    900: '#14532d',
                    950: '#052e16',
                },
                pitch: {
                    DEFAULT: '#0f172a', // Slate 900
                    surface: '#1e293b', // Slate 800
                },
            },
            boxShadow: {
                neon: '0 0 12px rgba(34, 197, 94, 0.5), 0 0 24px rgba(34, 197, 94, 0.25)',
                'neon-sm': '0 0 6px rgba(34, 197, 94, 0.4)',
            },
            screens: {
                xs: '360px',
            },
            fontFamily: {
                sport: ['Inter', 'sans-serif'], // Fallback
                display: ['Outfit', 'Inter', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(100%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            }
        },
    },
    plugins: [],
}
