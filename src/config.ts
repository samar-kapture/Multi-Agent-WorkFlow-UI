// src/config.ts

// Base URL for API requests
export const API_BASE_URL = "http://localhost:4500";

// Websocket URL
export const WS_URL = "ws://localhost:5000/multiagent-engine/llm/chat";

// Client name (stored as clientId in localStorage)
export const CLIENT_ID = localStorage.getItem('clientId') || "kapture";
