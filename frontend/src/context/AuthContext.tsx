"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  type User,
  type LoginPayload,
} from "@/lib/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dev mode: set NEXT_PUBLIC_DEV_AUTH=true in .env.local to bypass auth
const DEV_AUTH = process.env.NEXT_PUBLIC_DEV_AUTH === "true";

const MOCK_USER: User = {
  id: "dev-user-1",
  email: "dev@waves.app",
  firstName: "Dev",
  lastName: "User",
  dateOfBirth: "2000-01-01",
  username: "developer",
  aboutMe: "This is a mock user for development. Remove NEXT_PUBLIC_DEV_AUTH to disable.",
  avatarUrl: undefined,
  isPublic: true,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(DEV_AUTH ? MOCK_USER : null);
  const [isLoading, setIsLoading] = useState(!DEV_AUTH);

  async function checkSession() {
    if (DEV_AUTH) {
      setUser(MOCK_USER);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const result = await getCurrentUser();
    if (result.data) {
      setUser(result.data);
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    if (!DEV_AUTH) {
      checkSession();
    }
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const result = await loginUser(payload);
    if (result.error) {
      return { error: result.error };
    }
    // After login, fetch the full user to populate context
    const me = await getCurrentUser();
    if (me.data) {
      setUser(me.data);
    }
    return {};
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    await checkSession();
  }, []);

  const updateUser = useCallback((updated: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refresh,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
