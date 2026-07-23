/**
 * Firebase Authentication helpers + users collection persistence.
 *
 * - Google Sign-In via popup (redirect-safe fallback included)
 * - Email/password sign-in & sign-up
 * - Ensures a document exists at users/{uid} after every successful auth
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
  type Unsubscribe,
} from "firebase/auth";
import {
  doc,
  getDocFromServer,
  setDoc,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./config";
import { firebaseLogger } from "@/utils/logger";
import type { Role, User } from "@/lib/types";

const USERS_COLLECTION = "users";
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const AVATAR_COLORS = ["#2E6BE6", "#0D9488", "#D97706", "#DC2626", "#7C3AED", "#059669"];

function avatarColorFor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function mapFirebaseUserToAppUser(
  firebaseUser: FirebaseUser,
  data?: DocumentData | null
): User {
  const name =
    (data?.name as string | undefined) ||
    firebaseUser.displayName ||
    firebaseUser.email?.split("@")[0] ||
    "User";

  return {
    id: firebaseUser.uid,
    name,
    displayName: (data?.displayName as string | undefined) || firebaseUser.displayName || name,
    fullName: (data?.fullName as string | undefined) || name,
    email: firebaseUser.email ?? (data?.email as string | undefined) ?? "",
    role: ((data?.role as Role | undefined) ?? "Sales Engineer") as Role,
    avatarColor: (data?.avatarColor as string | undefined) || avatarColorFor(firebaseUser.uid),
    orgId: (data?.orgId as string | undefined) || `org_${firebaseUser.uid.slice(0, 8)}`,
    orgName: (data?.orgName as string | undefined) || "My Organization",
  };
}

/**
 * Read users/{uid} from the server (not cache), creating the doc if missing.
 * Wrapped in try/catch with detailed logging for connection diagnosis.
 */
export async function ensureUserDocument(firebaseUser: FirebaseUser): Promise<User> {
  const db = getFirebaseDb();
  const userRef = doc(db, USERS_COLLECTION, firebaseUser.uid);

  firebaseLogger.info("Firestore read: users/{uid}", {
    path: `${USERS_COLLECTION}/${firebaseUser.uid}`,
    uid: firebaseUser.uid,
  });

  try {
    const snapshot = await getDocFromServer(userRef);

    if (snapshot.exists()) {
      firebaseLogger.info("Firestore read success: user exists", {
        path: snapshot.ref.path,
        keys: Object.keys(snapshot.data()),
      });
      return mapFirebaseUserToAppUser(firebaseUser, snapshot.data());
    }

    const name = firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User";
    const newUser: Record<string, unknown> = {
      id: firebaseUser.uid,
      name,
      displayName: firebaseUser.displayName || name,
      fullName: name,
      email: firebaseUser.email ?? "",
      role: "Sales Engineer" satisfies Role,
      avatarColor: avatarColorFor(firebaseUser.uid),
      orgId: `org_${firebaseUser.uid.slice(0, 8)}`,
      orgName: "My Organization",
      photoURL: firebaseUser.photoURL ?? null,
      providerIds: firebaseUser.providerData.map((p) => p.providerId),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };

    firebaseLogger.info("Firestore write: create users/{uid}", {
      path: `${USERS_COLLECTION}/${firebaseUser.uid}`,
      email: newUser.email,
    });

    await setDoc(userRef, newUser);

    firebaseLogger.info("Firestore write success: user created", {
      path: `${USERS_COLLECTION}/${firebaseUser.uid}`,
    });

    return mapFirebaseUserToAppUser(firebaseUser, newUser);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : undefined;

    firebaseLogger.error("Firestore connection / users read-write failed", {
      path: `${USERS_COLLECTION}/${firebaseUser.uid}`,
      message,
      code,
      hint:
        "If you see 'client is offline' or 'Backend didn't respond within 10 seconds', " +
        "confirm Firestore is created for project salespilot-ai-66b72 in Firebase Console, " +
        "security rules allow authenticated reads/writes to users/{uid}, and the network " +
        "can reach firestore.googleapis.com.",
    });

    // Graceful degradation: keep the session usable from Auth profile alone.
    firebaseLogger.warn("Falling back to Auth-only user profile (no Firestore doc)");
    return mapFirebaseUserToAppUser(firebaseUser);
  }
}

/** Touch lastLoginAt after a successful sign-in (best-effort). */
async function touchLastLogin(uid: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const userRef = doc(db, USERS_COLLECTION, uid);
    firebaseLogger.info("Firestore write: update lastLoginAt", { path: `${USERS_COLLECTION}/${uid}` });
    await setDoc(userRef, { lastLoginAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
    firebaseLogger.info("Firestore write success: lastLoginAt updated", { uid });
  } catch (error) {
    firebaseLogger.error("Firestore write failed: lastLoginAt", {
      uid,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function signInWithGoogle(): Promise<{ user?: User; error?: string }> {
  const auth = getFirebaseAuth();
  try {
    firebaseLogger.info("Auth: Google sign-in starting (popup)");
    const credential = await signInWithPopup(auth, googleProvider);
    firebaseLogger.info("Auth: Google sign-in success", {
      uid: credential.user.uid,
      email: credential.user.email,
    });
    const user = await ensureUserDocument(credential.user);
    await touchLastLogin(credential.user.uid);
    return { user };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : undefined;
    const message = error instanceof Error ? error.message : String(error);

    // Popup blocked → fall back to redirect.
    if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user") {
      if (code === "auth/popup-blocked") {
        firebaseLogger.warn("Auth: popup blocked — switching to redirect", { code });
        try {
          await signInWithRedirect(auth, googleProvider);
          return {};
        } catch (redirectError) {
          firebaseLogger.error("Auth: Google redirect failed", {
            error: redirectError instanceof Error ? redirectError.message : String(redirectError),
          });
          return { error: "Google sign-in failed. Check that Google is enabled in Firebase Auth." };
        }
      }
      firebaseLogger.warn("Auth: Google popup closed by user", { code });
      return { error: "Google sign-in was cancelled." };
    }

    firebaseLogger.error("Auth: Google sign-in failed", { code, message });
    return {
      error:
        code === "auth/unauthorized-domain"
          ? "This domain is not authorized in Firebase Auth. Add localhost in Firebase Console → Authentication → Settings → Authorized domains."
          : message || "Google sign-in failed.",
    };
  }
}

/** Complete a Google redirect flow if one is pending (call once on app mount). */
export async function completeGoogleRedirectIfPresent(): Promise<User | null> {
  const auth = getFirebaseAuth();
  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) return null;
    firebaseLogger.info("Auth: Google redirect result received", {
      uid: result.user.uid,
      email: result.user.email,
    });
    const user = await ensureUserDocument(result.user);
    await touchLastLogin(result.user.uid);
    return user;
  } catch (error) {
    firebaseLogger.error("Auth: getRedirectResult failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user?: User; error?: string }> {
  const auth = getFirebaseAuth();
  try {
    firebaseLogger.info("Auth: email sign-in starting", { email });
    const credential = await signInWithEmailAndPassword(auth, email, password);
    firebaseLogger.info("Auth: email sign-in success", { uid: credential.user.uid });
    const user = await ensureUserDocument(credential.user);
    await touchLastLogin(credential.user.uid);
    return { user };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : undefined;
    firebaseLogger.error("Auth: email sign-in failed", {
      code,
      error: error instanceof Error ? error.message : String(error),
    });
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
      return { error: "That email or password doesn't look right. Try again." };
    }
    if (code === "auth/too-many-requests") {
      return { error: "Too many attempts. Wait a moment and try again." };
    }
    return { error: "Sign-in failed. Please try again." };
  }
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string
): Promise<{ user?: User; error?: string }> {
  const auth = getFirebaseAuth();
  try {
    firebaseLogger.info("Auth: email sign-up starting", { email });
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    firebaseLogger.info("Auth: email sign-up success", { uid: credential.user.uid });
    const user = await ensureUserDocument(credential.user);
    await touchLastLogin(credential.user.uid);
    return { user };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : undefined;
    firebaseLogger.error("Auth: email sign-up failed", {
      code,
      error: error instanceof Error ? error.message : String(error),
    });
    if (code === "auth/email-already-in-use") {
      return { error: "An account with that email already exists. Sign in instead." };
    }
    if (code === "auth/weak-password") {
      return { error: "Use at least 6 characters for your password." };
    }
    if (code === "auth/invalid-email") {
      return { error: "Enter a valid email address." };
    }
    return { error: "Could not create your account. Please try again." };
  }
}

export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  try {
    firebaseLogger.info("Auth: signing out", { uid: auth.currentUser?.uid });
    await firebaseSignOut(auth);
    firebaseLogger.info("Auth: signed out");
  } catch (error) {
    firebaseLogger.error("Auth: sign-out failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Subscribe to auth state. Resolves the Firestore user profile only after
 * Firebase Auth has emitted a user (avoids race: Firestore before Auth ready).
 */
export function subscribeToAuthState(
  onChange: (user: User | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const auth = getFirebaseAuth();
  firebaseLogger.info("Auth: subscribing to onAuthStateChanged");

  return onAuthStateChanged(
    auth,
    async (firebaseUser) => {
      firebaseLogger.info("Auth: state changed", {
        uid: firebaseUser?.uid ?? null,
        email: firebaseUser?.email ?? null,
        authenticated: Boolean(firebaseUser),
      });

      if (!firebaseUser) {
        onChange(null);
        return;
      }

      try {
        const user = await ensureUserDocument(firebaseUser);
        onChange(user);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        firebaseLogger.error("Auth: failed to resolve user profile after auth change", {
          message: err.message,
        });
        onError?.(err);
        // Still expose a minimal profile so protected routes aren't stuck loading.
        onChange(mapFirebaseUserToAppUser(firebaseUser));
      }
    },
    (error) => {
      const authError = error as Error & { code?: string };
      firebaseLogger.error("Auth: onAuthStateChanged error", {
        message: authError.message,
        code: authError.code,
      });
      onError?.(authError);
      onChange(null);
    }
  );
}
