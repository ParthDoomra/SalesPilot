/**
 * Firebase Client SDK — singleton initialisation from env vars.
 *
 * Must only be called from the browser (client components / effects).
 * Uses getApps()/getApp() so React Strict Mode and HMR never create
 * duplicate Firebase App instances.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  type Firestore,
} from "firebase/firestore";
import { firebaseLogger } from "@/utils/logger";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let initLogged = false;

function assertBrowser(): void {
  if (typeof window === "undefined") {
    throw new Error("Firebase client SDK can only be used in the browser.");
  }
}

function assertConfig(): void {
  const missing = (Object.entries(firebaseConfig) as [string, string | undefined][])
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    const message = `Missing Firebase environment variables: ${missing.join(", ")}`;
    firebaseLogger.error(message);
    throw new Error(message);
  }
}

/** True when all NEXT_PUBLIC_FIREBASE_* vars are present. */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.storageBucket &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId
  );
}

/**
 * Initialise (or reuse) the Firebase App singleton.
 */
export function getFirebaseApp(): FirebaseApp {
  assertBrowser();
  assertConfig();

  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    if (!initLogged) {
      initLogged = true;
      firebaseLogger.info("Firebase app initialized", {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        appCount: getApps().length,
        reused: getApps().length > 0,
      });
    }
  }

  return app;
}

/**
 * Auth singleton bound to the Firebase App.
 */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    firebaseLogger.info("Firebase Auth initialized");
  }
  return auth;
}

/**
 * Firestore singleton.
 *
 * Uses an in-memory local cache (no IndexedDB persistence) so a brief
 * connectivity blip cannot leave the client stuck in a stale "offline"
 * persistence state — a common cause of:
 *   "Failed to get document because the client is offline."
 *
 * experimentalForceLongPolling improves reliability behind restrictive
 * proxies / antivirus that break WebChannel streaming.
 */
export function getFirebaseDb(): Firestore {
  if (!db) {
    const firebaseApp = getFirebaseApp();
    try {
      db = initializeFirestore(firebaseApp, {
        localCache: memoryLocalCache(),
        experimentalForceLongPolling: true,
      });
      firebaseLogger.info("Firestore initialized", {
        projectId: firebaseConfig.projectId,
        cache: "memory",
        longPolling: true,
      });
    } catch (error) {
      // Already initialized in this JS realm (HMR / Strict Mode).
      db = getFirestore(firebaseApp);
      firebaseLogger.info("Firestore retrieved via getFirestore (already initialized)", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return db;
}

/** @deprecated Prefer getFirebaseApp / getFirebaseAuth / getFirebaseDb. */
export async function getFirebase(): Promise<{
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
} | null> {
  if (!isFirebaseConfigured()) {
    firebaseLogger.warn("Firebase env vars missing — not initializing");
    return null;
  }
  try {
    return {
      app: getFirebaseApp(),
      auth: getFirebaseAuth(),
      db: getFirebaseDb(),
    };
  } catch (error) {
    firebaseLogger.error("Firebase initialization failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function isMockMode(): boolean {
  return !isFirebaseConfigured();
}
