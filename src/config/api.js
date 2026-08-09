// Single source of truth for the API base URL.
// Override locally with a .env.local file: VITE_API_URL=http://localhost:3000
// (.env.local is already gitignored — see .gitignore's `*.local` rule)
export const API_URL = import.meta.env.VITE_API_URL || 'https://expense-tracker-api-0762.onrender.com';
