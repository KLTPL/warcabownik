import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface AuthContextType {
  isLoggedIn: boolean;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isTokenExpired = (token: string): boolean => {
  try {
    const payloadBase64 = token.split(".")[1];
    const decodedJson = atob(payloadBase64);
    const decoded = JSON.parse(decodedJson);
    if (!decoded.exp) return false;
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true; 
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setIsLoggedIn(false);
  };

  const login = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setIsLoggedIn(true);
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      if (isTokenExpired(savedToken)) {
        logout();
      } else {
        setToken(savedToken);
        setIsLoggedIn(true);
      }
    }
  }, []);

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const currentToken = token || localStorage.getItem("token");

    const headers = {
      ...options.headers,
      "Content-Type": "application/json",
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      logout();
    }

    return response;
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, token, login, logout, fetchWithAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};