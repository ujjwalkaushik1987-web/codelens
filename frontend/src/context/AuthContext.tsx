import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authApi } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; username: string; password: string; password_confirm: string; name?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('codelens_access_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      setUser(null);
      setToken(null);
      localStorage.removeItem('codelens_access_token');
      localStorage.removeItem('codelens_refresh_token');
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('codelens_access_token');
      if (storedToken) {
        try {
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
        } catch (err) {
          localStorage.removeItem('codelens_access_token');
          localStorage.removeItem('codelens_refresh_token');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('codelens_access_token', res.tokens.access);
    localStorage.setItem('codelens_refresh_token', res.tokens.refresh);
    setToken(res.tokens.access);
    setUser(res.user);
  };

  const register = async (payload: { email: string; username: string; password: string; password_confirm: string; name?: string }) => {
    const res = await authApi.register(payload);
    localStorage.setItem('codelens_access_token', res.tokens.access);
    localStorage.setItem('codelens_refresh_token', res.tokens.refresh);
    setToken(res.tokens.access);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('codelens_access_token');
    localStorage.removeItem('codelens_refresh_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
