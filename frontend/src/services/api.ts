import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
  withCredentials: false,
});

export const setAuthToken = (token?: string) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

// Global response interceptor: if any request returns 401 Unauthorized,
// clear client auth state and redirect to the login page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      try {
        // Remove persisted auth from localStorage (zustand persist key)
        localStorage.removeItem("hostelrec-auth");
      } catch (e) {
        // ignore
      }

      // Remove auth header for subsequent requests
      setAuthToken(undefined);

      // Redirect user to login page so they can re-authenticate
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// Try to rehydrate token synchronously from localStorage so requests made
// during initial component mount include Authorization header.
try {
  const raw = localStorage.getItem("hostelrec-auth");
  if (raw) {
    const parsed = JSON.parse(raw);
    // Zustand persist stores state under `state` key
    const token = parsed?.state?.token ?? parsed?.token ?? null;
    if (token) {
      setAuthToken(token);
    }
  }
} catch (e) {
  // ignore parsing errors
}

