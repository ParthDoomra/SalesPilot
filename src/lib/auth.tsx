"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { User } from "./types";
import { isFirebaseConfigured } from "@/services/firebase/config";
import {
  subscribeToAuthState,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOutUser,
  completeGoogleRedirectIfPresent,
  updateUserProfileInFirestore,
} from "@/services/firebase/auth";
import { firebaseLogger } from "@/utils/logger";

/**
 * Firebase Authentication provider.
 *
 * Session persistence is handled by Firebase Auth (survives page refresh).
 * User profile is loaded from / written to Firestore `users/{uid}`.
 */

interface AuthContextValue {
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  updateUserProfile: (data: { fullName: string; photoURL?: string | null }) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

const FIREBASE_READY = isFirebaseConfigured();
const CONFIG_ERROR = FIREBASE_READY
  ? null
  : "Firebase is not configured. Check your environment variables.";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [status, setStatus] = React.useState<"loading" | "authenticated" | "unauthenticated">(
    FIREBASE_READY ? "loading" : "unauthenticated"
  );
  const [error, setError] = React.useState<string | null>(CONFIG_ERROR);

  React.useEffect(() => {
    if (!FIREBASE_READY) {
      firebaseLogger.error(
        "Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars in .env.local"
      );
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        // Complete any pending Google redirect before attaching the listener.
        await completeGoogleRedirectIfPresent();
        if (cancelled) return;

        unsubscribe = subscribeToAuthState(
          (nextUser) => {
            if (cancelled) return;
            setUser(nextUser);
            setStatus(nextUser ? "authenticated" : "unauthenticated");
            setError(null);
          },
          (authError) => {
            if (cancelled) return;
            setError(authError.message);
          }
        );
      } catch (err) {
        firebaseLogger.error("AuthProvider failed to initialize", {
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to initialize authentication.");
          setStatus("unauthenticated");
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signIn = React.useCallback(async (email: string, password: string) => {
    setError(null);
    if (!email || !password) {
      return { error: "Enter your email and password to continue." };
    }
    const result = await signInWithEmail(email, password);
    if (result.error) {
      setError(result.error);
      return { error: result.error };
    }
    if (result.user) {
      setUser(result.user);
      setStatus("authenticated");
    }
    return {};
  }, []);

  const signUp = React.useCallback(async (name: string, email: string, password: string) => {
    setError(null);
    if (!name || !email || !password) {
      return { error: "Fill in every field to create your account." };
    }
    if (password.length < 6) {
      return { error: "Use at least 6 characters for your password." };
    }
    const result = await signUpWithEmail(name, email, password);
    if (result.error) {
      setError(result.error);
      return { error: result.error };
    }
    if (result.user) {
      setUser(result.user);
      setStatus("authenticated");
    }
    return {};
  }, []);

  const handleGoogleSignIn = React.useCallback(async () => {
    setError(null);
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
      return { error: result.error };
    }
    if (result.user) {
      setUser(result.user);
      setStatus("authenticated");
    }
    return {};
  }, []);

  const updateUserProfile = React.useCallback(
    async (data: { fullName: string; photoURL?: string | null }) => {
      if (!user) return { error: "No active session." };
      setError(null);
      try {
        const updatedUser = await updateUserProfileInFirestore(user.id, data);
        setUser(updatedUser);
        return {};
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: msg || "Failed to update profile." };
      }
    },
    [user]
  );

  const signOut = React.useCallback(async () => {
    setError(null);
    try {
      await signOutUser();
      setUser(null);
      setStatus("unauthenticated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-out failed.";
      setError(message);
    }
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      error,
      signIn,
      signUp,
      signInWithGoogle: handleGoogleSignIn,
      updateUserProfile,
      signOut,
    }),
    [user, status, error, signIn, signUp, handleGoogleSignIn, updateUserProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Redirects to /login if there is no active Firebase session. */
export function useRequireAuth() {
  const { status } = useAuth();
  const router = useRouter();
  React.useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);
  return status;
}
