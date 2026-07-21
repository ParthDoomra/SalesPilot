'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth, useMock, mockAuthService, UserPayload } from '@/lib/firebase';

interface AuthContextType {
  user: UserPayload | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load auth state
  useEffect(() => {
    if (useMock) {
      const mockUser = mockAuthService.getCurrentUser();
      setUser(mockUser);
      setLoading(false);
    } else {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          try {
            const token = await fbUser.getIdToken();
            // Fetch user profile or build claims
            setUser({
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || 'Enterprise User',
              role: fbUser.email?.includes('admin') ? 'Admin' : fbUser.email?.includes('architect') ? 'Solution Architect' : 'Sales Engineer',
              orgId: 'mock-org-123',
              token: token
            });
          } catch (e) {
            console.error("Error setting Firebase user session token:", e);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      return unsubscribe;
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      if (useMock) {
        const mockUser = await mockAuthService.login(email, password);
        setUser(mockUser);
      } else {
        const credentials = await signInWithEmailAndPassword(auth, email, password);
        const token = await credentials.user.getIdToken();
        setUser({
          uid: credentials.user.uid,
          email: credentials.user.email || '',
          displayName: credentials.user.displayName || email.split('@')[0].toUpperCase(),
          role: email.includes('admin') ? 'Admin' : email.includes('architect') ? 'Solution Architect' : 'Sales Engineer',
          orgId: 'mock-org-123',
          token: token
        });
      }
      router.push('/dashboard');
    } catch (e: any) {
      setLoading(false);
      throw new Error(e.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      if (useMock) {
        const mockUser = await mockAuthService.register(email, password, name);
        setUser(mockUser);
      } else {
        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        const token = await credentials.user.getIdToken();
        setUser({
          uid: credentials.user.uid,
          email: credentials.user.email || '',
          displayName: name,
          role: 'Sales Engineer',
          orgId: 'mock-org-123',
          token: token
        });
      }
      router.push('/dashboard');
    } catch (e: any) {
      setLoading(false);
      throw new Error(e.message || "Failed to register.");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (useMock) {
        await mockAuthService.logout();
      } else {
        await fbSignOut(auth);
      }
      setUser(null);
      router.push('/auth/login');
    } catch (e) {
      console.error("Sign out error:", e);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    if (useMock) {
      await mockAuthService.resetPassword(email);
    } else {
      await sendPasswordResetEmail(auth, email);
    }
  };

  const googleLogin = async () => {
    setLoading(true);
    try {
      if (useMock) {
        const mockUser = await mockAuthService.login("google-admin@salespilot.ai", "dummy");
        setUser(mockUser);
      } else {
        const provider = new GoogleAuthProvider();
        const credentials = await signInWithPopup(auth, provider);
        const token = await credentials.user.getIdToken();
        setUser({
          uid: credentials.user.uid,
          email: credentials.user.email || '',
          displayName: credentials.user.displayName || 'Google User',
          role: 'Sales Engineer',
          orgId: 'mock-org-123',
          token: token
        });
      }
      router.push('/dashboard');
    } catch (e: any) {
      setLoading(false);
      throw new Error(e.message || "Failed to complete Google Sign In.");
    } finally {
      setLoading(false);
    }
  };

  // Automated Auth Header Injection
  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    
    // Auto prefix "/"
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    const headers = new Headers(options.headers || {});
    
    // Inject Token
    if (user?.token) {
      headers.set('Authorization', `Bearer ${user.token}`);
    }
    
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers
    });
    
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `Request failed with status ${res.status}`);
    }
    
    return res.json();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, resetPassword, googleLogin, apiFetch }}>
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
