// src/config.ts

// Base URL for API requests
export const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL;

// Websocket URL
export const WS_URL = (import.meta as any).env.VITE_WS_URL;

// Client name (stored as clientId in localStorage)
export const CLIENT_ID = localStorage.getItem('clientId') || "demo-client";
