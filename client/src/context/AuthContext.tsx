import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types.js';
import { api } from '../api/client.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string, enforceMfa?: boolean) => Promise<{ requiresMfa?: boolean; mfaChallengeToken?: string; user?: User }>;
  verifyMfa: (challengeToken: string, code: string) => Promise<User>;
  switchRole: (role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('nyayasetu_token') || localStorage.getItem('kavach_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const profile = await api.getMe();
          setUser(profile);
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (identifier: string, password: string, enforceMfa?: boolean) => {
    const res = await api.login(identifier, password, enforceMfa);
    if (res.requiresMfa) {
      return { requiresMfa: true, mfaChallengeToken: res.mfaChallengeToken };
    }
    if (res.accessToken && res.user) {
      localStorage.setItem('nyayasetu_token', res.accessToken);
      setToken(res.accessToken);
      setUser(res.user);
      return { user: res.user };
    }
    throw new Error('Authentication failed');
  };

  const verifyMfa = async (challengeToken: string, code: string): Promise<User> => {
    const res = await api.verifyMfa(challengeToken, code);
    if (res.accessToken && res.user) {
      localStorage.setItem('nyayasetu_token', res.accessToken);
      setToken(res.accessToken);
      setUser(res.user);
      return res.user;
    }
    throw new Error('Invalid MFA response');
  };

  const switchRole = async (role: UserRole) => {
    if (user) {
      try {
        const res = await api.switchRole(role);
        localStorage.setItem('nyayasetu_token', res.accessToken);
        setToken(res.accessToken);
        setUser(res.user);
      } catch (err) {
        console.error('Role switch error', err);
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('nyayasetu_token');
    localStorage.removeItem('kavach_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, verifyMfa, switchRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
