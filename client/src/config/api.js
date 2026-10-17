/**
 * Central API Configuration for D.WORLD Client
 * 
 * Always uses same-origin relative '/api' unless VITE_API_URL is explicitly set.
 * This guarantees zero CORS issues across localhost, 127.0.0.1, LAN IP, and Render.
 */
export const API_URL = import.meta.env.VITE_API_URL || '/api';

export default API_URL;
