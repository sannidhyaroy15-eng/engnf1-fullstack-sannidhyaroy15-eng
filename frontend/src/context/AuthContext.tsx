import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, extractErrorMessage } from '../services/api';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, passwordPlain: string) => Promise<void>;
  register: (name: string, email: string, passwordPlain: string) => Promise<void>;
  logout: () => void;
  agentHeader: string;
  setAgentHeader: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('triagesync_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [agentHeader, setAgentHeaderState] = useState<string>(() => {
    return localStorage.getItem('triagesync_agent_name') || '';
  });

  const setAgentHeader = (name: string) => {
    setAgentHeaderState(name);
    if (name) {
      localStorage.setItem('triagesync_agent_name', name);
    } else {
      localStorage.removeItem('triagesync_agent_name');
    }
  };

  useEffect(() => {
    async function initAuth() {
      const savedToken = localStorage.getItem('triagesync_token');
      if (!savedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.auth.getMe();
        setUser(res.user);
      } catch {
        api.auth.logout();
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (email: string, passwordPlain: string) => {
    const res = await api.auth.login({ email, passwordPlain });
    setUser(res.user);
    setToken(res.token);
    if (!agentHeader) {
      setAgentHeader(res.user.email);
    }
  };

  const register = async (name: string, email: string, passwordPlain: string) => {
    await api.auth.register({ name, email, passwordPlain });
    // Automatically log in after successful registration
    await login(email, passwordPlain);
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        agentHeader,
        setAgentHeader,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
