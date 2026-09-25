import { useState, type ReactNode } from "react";
import { isTokenExpired } from "@/lib/jwt";
import { AuthContext } from "./auth-context";

/**
 * Reads the persisted session once, before the first render, so a reload never
 * paints a logged-out UI for a user who still holds a valid token.
 */
const readStoredToken = (): string | null => {
  const savedToken = localStorage.getItem("token");
  if (!savedToken) return null;
  if (isTokenExpired(savedToken)) {
    localStorage.removeItem("token");
    return null;
  }
  return savedToken;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readStoredToken);

  const isLoggedIn = token !== null;

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  const login = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
