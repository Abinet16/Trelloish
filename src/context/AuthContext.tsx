// src/context/AuthContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useMemo,
  useEffect,
} from "react";

interface User {
  id: string;
  email: string;
  globalStatus: "ACTIVE" | "BANNED" | "ADMIN";
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem("accessToken")
  );
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem("user");
    }
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setAccessToken(token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setAccessToken(null);
    setUser(null);
  };

  const contextValue = useMemo(
    () => ({
      isAuthenticated: !!accessToken && !!user,
      user,
      login,
      logout,
    }),
    [accessToken, user]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
