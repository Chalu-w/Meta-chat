import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, updateProfile } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// User's Firebase web configuration
export const firebaseConfig = {
  apiKey: "AIzaSyDI3NVGserVisVmwkdnjimEhF8AnIAhcXQ",
  authDomain: "meta-chat-5180c.firebaseapp.com",
  projectId: "meta-chat-5180c",
  storageBucket: "meta-chat-5180c.firebasestorage.app",
  messagingSenderId: "903813464621",
  appId: "1:903813464621:web:fd071636142694bb33eea4",
  measurementId: "G-XC6LQM5ZL2"
};

// Singleton initialization
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Language config for phone SMS verification
auth.useDeviceLanguage();

export type { ConfirmationResult };
export { RecaptchaVerifier, signInWithPhoneNumber, updateProfile };


