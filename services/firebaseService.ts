import * as firebaseApp from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut, 
  onAuthStateChanged, 
  User,
  Auth
} from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  setDoc, 
  onSnapshot, 
  persistentLocalCache, 
  Firestore 
} from "firebase/firestore";
import { BlockData, Edge } from "../types";
import { firebaseConfig } from "./firebaseConfig";

let app: any;
let auth: Auth;
let db: Firestore;

export const initializeFirebase = () => {
    try {
        if (!firebaseApp.getApps().length) {
            app = firebaseApp.initializeApp(firebaseConfig);
            auth = getAuth(app);
            // Initialize Firestore with persistent cache for offline support
            db = initializeFirestore(app, {
                localCache: persistentLocalCache()
            });
        } else {
            app = firebaseApp.getApp();
            auth = getAuth(app);
            db = getFirestore(app);
        }
        return { app, auth, db };
    } catch (error) {
        console.error("Firebase initialization error:", error);
        return { app: undefined, auth: undefined, db: undefined };
    }
};

// Initialize immediately so db/auth are available
initializeFirebase();

// -- Auth --

const ensureAuth = () => {
    if (!auth) {
        initializeFirebase();
        if (!auth) throw new Error("Firebase Auth not initialized. Check your API keys and configuration.");
    }
    return auth;
};

export const signInWithGoogle = async () => {
    const a = ensureAuth();
    const provider = new GoogleAuthProvider();
    return signInWithPopup(a, provider);
};

export const signUpWithEmail = async (email: string, pass: string) => {
    const a = ensureAuth();
    return createUserWithEmailAndPassword(a, email, pass);
};

export const logInWithEmail = async (email: string, pass: string) => {
    const a = ensureAuth();
    return signInWithEmailAndPassword(a, email, pass);
};

export const logout = async () => {
    if (!auth) return;
    return signOut(auth);
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
    if (!auth) initializeFirebase();
    if (!auth) {
        callback(null);
        return () => {};
    }
    return onAuthStateChanged(auth, callback);
};

// -- Data Sync (users/{userId}/notes/main) --

export const saveWorkspaceToCloud = async (userId: string, data: { blocks: BlockData[], edges: Edge[] }) => {
    if (!db) initializeFirebase();
    if (!db) return;
    
    try {
        // Firestore doesn't support 'undefined', so we strip it out
        // JSON.stringify removes keys with undefined values
        const cleanData = JSON.parse(JSON.stringify(data));

        await setDoc(doc(db, "users", userId, "notes", "main"), {
            ...cleanData,
            lastUpdated: new Date()
        });
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            console.error("Cloud sync permission denied. Please check your Firestore security rules.");
            console.warn(
                "To fix this, go to Firebase Console > Firestore Database > Rules and paste this:\n\n" +
                "rules_version = '2';\n" +
                "service cloud.firestore {\n" +
                "  match /databases/{database}/documents {\n" +
                "    match /users/{userId}/{document=**} {\n" +
                "      allow read, write: if request.auth != null && request.auth.uid == userId;\n" +
                "    }\n" +
                "  }\n" +
                "}"
            );
        } else {
            console.error("Error saving workspace:", e);
        }
        throw e;
    }
};

export const subscribeToWorkspace = (userId: string, callback: (data: { blocks: BlockData[], edges: Edge[] } | null) => void) => {
    if (!db) initializeFirebase();
    if (!db) return () => {};

    return onSnapshot(doc(db, "users", userId, "notes", "main"), 
        (docSnap) => {
            if (docSnap.exists()) {
                callback(docSnap.data() as any);
            } else {
                callback(null);
            }
        },
        (error) => {
            if (error.code === 'permission-denied') {
                console.warn("Cloud sync read permission denied.");
            } else {
                console.error("Firestore subscription error:", error);
            }
        }
    );
};