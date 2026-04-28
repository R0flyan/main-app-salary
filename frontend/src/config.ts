const rawApiUrl = import.meta.env.VITE_API_URL;

export const API_URL = (rawApiUrl || "http://localhost:8000").replace(/\/$/, "");
