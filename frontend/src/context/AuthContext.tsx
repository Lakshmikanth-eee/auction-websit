import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';

interface AdminUser {
  id: string;
  username: string;
}

interface AuthContextType {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, admin: AdminUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetchAPI('/admin/auth/check');
        if (res.success && res.admin) {
          setAdmin(res.admin);
        } else {
          localStorage.removeItem('admin_token');
        }
      } catch (err) {
        localStorage.removeItem('admin_token');
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, []);

  const login = (token: string, adminUser: AdminUser) => {
    localStorage.setItem('admin_token', token);
    setAdmin(adminUser);
  };

  const logout = async () => {
    try {
      await fetchAPI('/admin/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('admin_token');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        login,
        logout,
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
