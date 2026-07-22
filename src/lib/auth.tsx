"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CURRENT_USER } from "./mock-data";
import type { User } from "./types";

/**
 * Mock authentication layer.
 *
 * This mirrors the shape of a real Firebase Auth integration so it can be
 * swapped in later without touching consuming components:
 *   - `user` matches the app's `User` type (would come from Firestore's
 *     `users` collection, keyed by Firebase Auth UID).
 *   - `signIn` / `signUp` / `signOut` are async and return the same shape
 *     `onAuthStateChanged` + a Firestore read would produce.
 *   - Session is persisted to localStorage instead of a Firebase session
 *     cookie/token.
 */

interface AuthContextValue {
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "salespilot_session";

function fakeDelay(ms = 550) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [status, setStatus] = React.useState<"loading" | "authenticated" | "unauthenticated">("loading");

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setUser(JSON.parse(raw));
        setStatus("authenticated");
      } else {
        setStatus("unauthenticated");
      }
    } catch {
      setStatus("unauthenticated");
    }
  }, []);

  const signIn = React.useCallback(async (email: string, password: string) => {
    await fakeDelay();
    if (!email || !password) {
      return { error: "Enter your email and password to continue." };
    }
    if (password.length < 4) {
      return { error: "That password doesn't look right. Try again." };
    }
    const sessionUser: User = { ...CURRENT_USER, email, displayName: CURRENT_USER.name };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
    setStatus("authenticated");
    return {};
  }, []);

  const signUp = React.useCallback(async (name: string, email: string, password: string) => {
    await fakeDelay(700);
    if (!name || !email || !password) {
      return { error: "Fill in every field to create your account." };
    }
    if (password.length < 6) {
      return { error: "Use at least 6 characters for your password." };
    }
    const sessionUser: User = { ...CURRENT_USER, name, email, displayName: name };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
    setStatus("authenticated");
    return {};
  }, []);

  const signOut = React.useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Redirects to /login if there is no active mock session. */
export function useRequireAuth() {
  const { status } = useAuth();
  const router = useRouter();
  React.useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);
  return status;
}
