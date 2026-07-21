import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  sendPasswordResetEmail, 
  GoogleAuthProvider, 
  signInWithCredential
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const isConfigured = !!(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
);

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true" || !isConfigured;

// Initialize Firebase App
let app;
let auth: any;

if (!useMock) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (e) {
    console.error("Firebase client initialization failed, switching to mock auth:", e);
  }
}

export { auth, useMock };

// Mock auth database in localStorage for dynamic persistence during browser reload
export interface UserPayload {
  uid: string;
  email: string;
  displayName: string;
  role: 'Admin' | 'Sales Engineer' | 'Solution Architect' | 'Viewer';
  orgId: string;
  token: string;
}

const MOCK_STORAGE_KEY = "salespilot_mock_user";

export const mockAuthService = {
  getCurrentUser: (): UserPayload | null => {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem(MOCK_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  },

  login: async (email: string, password: string): Promise<UserPayload> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    let role: any = "Sales Engineer";
    if (email.includes("admin")) role = "Admin";
    if (email.includes("architect")) role = "Solution Architect";
    if (email.includes("viewer")) role = "Viewer";

    const user: UserPayload = {
      uid: email.includes("admin") ? "mock-admin-uid" : "mock-se-uid",
      email: email,
      displayName: email.split("@")[0].toUpperCase(),
      role: role,
      orgId: "mock-org-123",
      token: "mock-jwt-token-12345"
    };

    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  register: async (email: string, password: string, name: string): Promise<UserPayload> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const user: UserPayload = {
      uid: "mock-uid-" + Math.floor(Math.random() * 10000),
      email: email,
      displayName: name,
      role: "Sales Engineer",
      orgId: "mock-org-123",
      token: "mock-jwt-token-" + Math.floor(Math.random() * 100000)
    };
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  logout: async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    localStorage.removeItem(MOCK_STORAGE_KEY);
  },

  resetPassword: async (email: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Mock reset password email sent to ${email}`);
  }
};
