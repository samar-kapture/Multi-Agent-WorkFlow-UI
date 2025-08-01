// src/config.ts

export const API_BASE_URL = "http://localhost:4500";

// Client name for display (stored as clientId in localStorage)
export const CLIENT_ID = localStorage.getItem('clientId') || "kapture";

// Actual client_id for API calls
export const API_CLIENT_ID = localStorage.getItem('apiClientId') || "kapture";

export const WS_URL = "ws://localhost:5000/multiagent-engine/llm/chat";