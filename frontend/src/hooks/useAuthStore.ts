import { create } from "zustand";
import { persist } from "zustand/middleware";

import { setAuthToken } from "../services/api";
import { api } from "../services/api";

export type Role = "receptionist" | "manager" | "cleaner" | "customer" | null;

export interface AuthState {
  token: string | null;
  role: Role;
  setCredentials: (token: string, role: Role) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      setCredentials: (token, role) => {
        setAuthToken(token);
        set({ token, role });
      },
      logout: async () => {
        try {
          // Вызвать API для завершения сессии на сервере
          await api.post("/auth/logout");
        } catch (error) {
          // Игнорируем ошибки при выходе (токен может быть уже невалидным)
          console.error("Logout error:", error);
        } finally {
          setAuthToken(undefined);
          set({ token: null, role: null });
        }
      }
    }),
    {
      name: "hostelrec-auth",
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAuthToken(state.token);
        }
      }
    }
  )
);

