import React, { createContext, useContext, useState, useEffect } from 'react';
import { devApi } from '../lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUser = async () => {
    try {
      const res = await devApi.getMe();
      if (res?.data?.user) {
        setUser(res.data.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error("AuthContext user fetch error:", err);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('dev_token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token: string) => {
    localStorage.setItem('dev_token', token);
    // Fresh login must not inherit another account's app selection,
    // otherwise the dashboard 403s on apps the new user doesn't own.
    localStorage.removeItem('selected_app_id');
    setIsAuthenticated(true);
    setLoading(true);
    fetchUser();
  };

  const logout = async () => {
    try {
      if (isAuthenticated) {
        await devApi.logout();
      }
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      localStorage.removeItem('dev_token');
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('dev_token');
    if (token) {
      await fetchUser();
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout, refreshUser }}>
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
