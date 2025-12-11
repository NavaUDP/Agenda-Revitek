// navaudp/agenda-revitek/Agenda-Revitek-Nava/revitek/front/src/api/http.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// Extensión del tipo de configuración para incluir skipAuth
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

// --- URLS de la API ---
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const REFRESH_URL = "/api/auth/token/refresh/";
const LOGIN_URL = "/api/auth/token/"; // Para evitar bucles en la página de login

const http = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
});

// --- Interceptor de Solicitud (Request) ---
// Solo agrega token si la petición no está marcada como skipAuth
http.interceptors.request.use(
  (config) => {
    // Si la petición está marcada como skipAuth, no agregamos el token
    if (config.skipAuth) {
      return config;
    }
    
    try {
      const token = localStorage.getItem('access_token');
      if (token && config.headers) {
        // Verificamos y asignamos directamente
        if (!config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (e) {
      // localStorage puede no estar disponible
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Lógica de Refresco de Token ---

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });
  failedQueue = [];
};

const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete http.defaults.headers.common['Authorization'];
    // Redirige a login solo si no estamos ya ahí
    if (!window.location.pathname.includes('/login')) {
         window.location.href = '/login';
    }
}

// --- NUEVO: Interceptor de Respuesta (Response) ---
http.interceptors.response.use(
  (response) => {
    // Si la respuesta es exitosa, simplemente la retornamos.
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!error.response) {
       // Error de red o algo inesperado
       return Promise.reject(error);
    }
    
    // --- Lógica de 401 (Token Expirado) ---
    // Verificamos si es un 401, si no es un reintento, y si no es la propia URL de login o refresh.
    // IMPORTANTE: Si la petición está marcada como skipAuth, no intentamos refrescar token ni redirigir
    if (error.response.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.skipAuth &&
        originalRequest.url !== REFRESH_URL &&
        originalRequest.url !== LOGIN_URL) {
      
      if (isRefreshing) {
        // Si ya estamos refrescando, ponemos esta solicitud en cola.
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            // Cuando la promesa de refresco se resuelva, reintentamos con el nuevo token.
            originalRequest.headers!['Authorization'] = 'Bearer ' + token;
            return http(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      // Marcamos esta solicitud como reintento y activamos la bandera de refresco
      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        // Si no hay refresh token, no podemos hacer nada. Deslogueamos.
        handleLogout();
        return Promise.reject(error);
      }

      try {
        // Usamos axios.post (global) para evitar que este interceptor se llame a sí mismo
        const rs = await axios.post(`${BASE_URL}${REFRESH_URL}`, {
          refresh: refreshToken,
        });

        const newAccessToken = rs.data.access;

        // 1. Guardamos el nuevo token
        localStorage.setItem('access_token', newAccessToken);

        // 2. Actualizamos el header por defecto de la instancia http
        http.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

        // 3. Actualizamos el header de la solicitud original
        originalRequest.headers!['Authorization'] = `Bearer ${newAccessToken}`;

        // 4. Procesamos la cola de peticiones fallidas con el nuevo token
        processQueue(null, newAccessToken);

        // 5. Reintentamos la solicitud original
        return http(originalRequest);
        
      } catch (refreshError: any) {
        // El refresh token falló (expiró, fue revocado, etc.)
        console.error("Fallo al refrescar el token:", refreshError);
        
        // 1. Deslogueamos al usuario
        handleLogout();
        
        // 2. Rechazamos la cola de peticiones
        processQueue(refreshError as AxiosError, null);
        
        // 3. Rechazamos la promesa original
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Para cualquier otro error (ej: 404, 500, o un 401 en el login),
    // simplemente devolvemos el error.
    console.error("API error (no 401 o no manejado):", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default http;