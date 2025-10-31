import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  withCredentials: false,
});

// Attach Authorization header from localStorage (if present) to every request
http.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        // Work around axios TS types by using any for headers
        const headers = (config.headers as any) || {};
        if (!headers.Authorization && !headers['Authorization']) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        config.headers = headers;
      }
    } catch (e) {
      // localStorage might not be available in some environments - ignore
    }
    return config;
  },
  (error) => Promise.reject(error)
);

http.interceptors.response.use(
  (r) => r,
  (e) => { console.error("API error:", e?.response?.data || e.message); return Promise.reject(e); }
);

export default http;
