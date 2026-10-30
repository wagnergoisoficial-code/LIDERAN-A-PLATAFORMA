import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, TOKEN_KEY, USER_KEY } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'leader' | 'admin';
  churchId: string | null;
  profileImage?: string | null;
  title?: string | null;
}

export interface Session {
  user: User;
  token: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  applySession: (session?: Session | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = useCallback((userData: User, authToken: string) => {
    localStorage.setItem(TOKEN_KEY, authToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
    setToken(authToken);
  }, []);

  // Sessão devolvida pelo backend (ex.: ao criar ou ativar uma comunidade)
  const applySession = useCallback((session?: Session | null) => {
    if (session?.user && session?.token) login(session.user, session.token);
  }, [login]);

  // Recarrega os dados do utilizador (comunidade, cargo, foto) a partir do backend
  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    try {
      const res = await api.me();
      if (res.success) applySession(res.data);
    } catch {
      /* 401 já encerra a sessão em api.ts; falhas de rede mantêm os dados locais */
    }
  }, [applySession]);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        refreshUser();
      } catch (e) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, [refreshUser]);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setToken(null);
    window.location.href = '/login';
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...userData };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      updateUser,
      refreshUser,
      applySession,
      isAuthenticated: !!token,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
