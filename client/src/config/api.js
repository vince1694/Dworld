/**
 * Central API Configuration for D.WORLD Client
 * 
 * In development: defaults to 'http://localhost:5000/api'
 * In production: defaults to '/api' (same-origin when served by Express on Render)
 * Custom override: set VITE_API_URL in your environment
 */
export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

export default API_URL;
