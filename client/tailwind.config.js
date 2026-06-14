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
                turf: {
                    400: '#4ade80', // Example green
                    500: '#22c55e',
                    600: '#16a34a',
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
