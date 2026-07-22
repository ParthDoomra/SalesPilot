/**
 * Firebase Client SDK — initialisation from env vars.
 *
 * When Firebase isn't configured (no env vars) or installed,
 * falls back to a "mock mode" that stores data in memory.
 * This lets the app run locally without any Firebase setup.
 */

import { firebaseLogger } from '@/utils/logger';

let _mockMode = true;

export function isMockMode(): boolean {
  return _mockMode;
}

/**
 * Returns null — Firebase is optional for Phase 2.
 * When the firebase package is installed and env vars are set,
 * this function can be expanded to initialise the client SDK.
 *
 * For now, all Firebase services use in-memory stores.
 */
export async function getFirebase(): Promise<null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    _mockMode = true;
    return null;
  }

  // Firebase SDK would be initialised here when the package is installed.
  // For now, we log and fall back to mock mode.
  firebaseLogger.warn('Firebase env vars set but firebase package not installed — using mock mode');
  _mockMode = true;
  return null;
}
