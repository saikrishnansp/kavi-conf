import { toast } from "sonner";
import { authApi } from "@/lib/api/auth";
import { UserResponse } from "@/types/api";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthContextType {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  loginWithToken: (token: string, googleToken?: string) => void;
  logout: () => void;
  token: string | null;
  googleToken: string | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("token"),
  );
  const [googleToken, setGoogleToken] = useState<string | null>(
    () => localStorage.getItem("google_token"),
  );
  const [isLoading, setIsLoading] = useState(true);

  // Helper to decode JWT payload without external library
  const getGoogleTokenFromJwt = (tokenStr: string): string | null => {
    try {
      const base64Url = tokenStr.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );
      const payload = JSON.parse(jsonPayload);
      return payload.google_access_token || null;
    } catch (e) {
      console.error("Failed to decode JWT for google token:", e);
      return null;
    }
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const userData = await authApi.getMe();
        setUser(userData);
      } catch (error) {
        console.error("Failed to refresh user:", error);
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      // 1. Check for tokens in URL fragment (from Google OAuth redirect)
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const appToken = params.get("token");
        const gToken = params.get("google_token");

        if (appToken) {
          localStorage.setItem("token", appToken);
          setToken(appToken);
          if (gToken) {
            localStorage.setItem("google_token", gToken);
            setGoogleToken(gToken);
          }
          // Clean up the hash from the URL
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          
          // The token change will trigger the next initAuth cycle or we can fetch user now
          try {
            const userData = await authApi.getMe();
            setUser(userData);
            setIsLoading(false);
            toast.success("Welcome back!", {
              description: "Successfully logged in via Google.",
            });
            return;
          } catch (e) {
            console.error("Failed to fetch user after OAuth", e);
          }
        }
      }

      // 2. Regular initialization from localStorage
      if (token) {
        // Fallback: If we have an app token but no google token, try to recover it from the JWT
        if (!googleToken) {
          const recovered = getGoogleTokenFromJwt(token);
          if (recovered) {
            localStorage.setItem("google_token", recovered);
            setGoogleToken(recovered);
          }
        }

        try {
          const userData = await authApi.getMe();
          setUser(userData);
        } catch (error) {
          console.error("Failed to fetch user:", error);
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [token]);

  const verifyOtp = async (email: string, otp: string) => {
    try {
      const response = await authApi.verifyOtp(email, otp);
      loginWithToken(response.access_token);
      toast.success("Welcome back!", {
        description: "Successfully logged in.",
      });
      // User will be fetched by useEffect
    } catch (error: any) {
      toast.error("Login Failed", {
        description: error.response?.data?.detail || "Invalid OTP",
      });
      throw error;
    }
  };

  const loginWithToken = (accessToken: string, gToken?: string) => {
    localStorage.setItem("token", accessToken);
    setToken(accessToken);
    if (gToken) {
      localStorage.setItem("google_token", gToken);
      setGoogleToken(gToken);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("google_token");
    setToken(null);
    setGoogleToken(null);
    setUser(null);
  };

  return (
    <AuthContext
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        verifyOtp,
        loginWithToken,
        logout,
        token,
        googleToken,
        refreshUser,
      }}
    >
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
