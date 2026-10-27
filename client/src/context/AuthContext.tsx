import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { User } from '../types.js';
import { api } from '../services/api.js';
import { socket } from '../services/socket.js';
import { auth, db, updateProfile } from '../firebase.js';
import { FirestoreChatService } from '../services/firestoreChat.js';
import { getDefaultAvatar } from '../services/storage.service.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  loginWithPhoneOtp: (phone: string, code: string) => Promise<void>;
  loginWithFirebaseToken: (idToken: string, phone: string, displayName?: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  updateCurrentUser: (updates: Partial<User>) => Promise<void>;
  switchDemoUser: (identifier: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(api.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth state and listen to Firebase auth changes
  useEffect(() => {
    let isMounted = true;

    const unsubscribeFirebase = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          const verifiedPhone = fbUser.phoneNumber || '';

          // 1. Fetch previously saved profile document from Firestore to restore photoURL and details
          let savedAvatar = fbUser.photoURL || '';
          let savedDisplayName = fbUser.displayName || '';
          let savedBio = 'Using Meta Chat';
          let savedUsername = `user_${fbUser.uid.slice(0, 6)}`;

          try {
            const userSnap = await getDoc(doc(db, 'users', fbUser.uid));
            if (userSnap.exists()) {
              const data = userSnap.data();
              if (data.avatarUrl || data.photoURL) {
                savedAvatar = data.avatarUrl || data.photoURL;
              }
              if (data.displayName) savedDisplayName = data.displayName;
              if (data.bio) savedBio = data.bio;
              if (data.username) savedUsername = data.username;
            }
          } catch (docErr) {
            console.warn('[Auth] Firestore user doc read note:', docErr);
          }

          const resolvedDisplayName =
            savedDisplayName ||
            `User ${verifiedPhone ? verifiedPhone.slice(-4) : fbUser.uid.slice(0, 5)}`;
          const resolvedAvatarUrl = savedAvatar || getDefaultAvatar(fbUser.uid);

          // 2. Authenticate with server backend to get JWT and user record
          try {
            const res = await api.firebaseLogin(idToken, verifiedPhone, resolvedDisplayName);
            if (isMounted && res.user && res.token) {
              const fullUser: User = {
                ...res.user,
                id: fbUser.uid,
                uid: fbUser.uid,
                phone: verifiedPhone || res.user.phone,
                displayName: resolvedDisplayName,
                avatarUrl: resolvedAvatarUrl,
                bio: savedBio || res.user.bio,
                username: savedUsername || res.user.username,
              };
              setUser(fullUser);
              setToken(res.token);
              socket.authenticate(res.token);

              // Sync profile with Firestore
              await FirestoreChatService.syncUserProfile(fullUser);
              setIsLoading(false);
              return;
            }
          } catch (serverErr) {
            console.warn('[Auth] Server sync note:', serverErr);
          }

          // Fallback direct Firebase user state
          if (isMounted) {
            const fallbackUser: User = {
              id: fbUser.uid,
              uid: fbUser.uid,
              phone: verifiedPhone,
              username: savedUsername,
              displayName: resolvedDisplayName,
              bio: savedBio,
              avatarUrl: resolvedAvatarUrl,
              status: 'online',
              lastSeen: new Date().toISOString(),
              language: 'en',
              theme: 'telegram-dark',
              notificationsEnabled: true,
              privacyLastSeen: 'everybody',
              createdAt: new Date().toISOString(),
            };
            setUser(fallbackUser);
            await FirestoreChatService.syncUserProfile(fallbackUser);
          }
        } catch (err) {
          console.error('[Auth] Firebase token error:', err);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } else {
        // No Firebase user active: check existing stored JWT token
        const storedToken = api.getToken();
        if (storedToken) {
          try {
            const res = await api.getMe();
            if (isMounted && res.user) {
              setUser(res.user);
              socket.authenticate(storedToken);
            }
          } catch {
            api.setToken(null);
            if (isMounted) {
              setToken(null);
              setUser(null);
            }
          }
        } else {
          if (isMounted) {
            setUser(null);
            setToken(null);
          }
        }
        if (isMounted) setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeFirebase();
    };
  }, []);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(identifier, password);
      setUser(res.user);
      setToken(res.token);
      socket.authenticate(res.token);
      await FirestoreChatService.syncUserProfile(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPhoneOtp = async (phone: string, code: string) => {
    setIsLoading(true);
    try {
      const res = await api.verifyOtp(phone, code);
      if (res.user && res.token) {
        setUser(res.user);
        setToken(res.token);
        socket.authenticate(res.token);
        await FirestoreChatService.syncUserProfile(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithFirebaseToken = async (idToken: string, phone: string, displayName?: string) => {
    setIsLoading(true);
    try {
      const res = await api.firebaseLogin(idToken, phone, displayName);
      if (res.user && res.token) {
        const fullUser: User = {
          ...res.user,
          id: auth.currentUser?.uid || res.user.id,
          uid: auth.currentUser?.uid || res.user.id,
          phone: auth.currentUser?.phoneNumber || phone || res.user.phone,
          displayName: displayName || res.user.displayName,
          avatarUrl: auth.currentUser?.photoURL || res.user.avatarUrl || getDefaultAvatar(res.user.id),
        };
        setUser(fullUser);
        setToken(res.token);
        socket.authenticate(res.token);
        await FirestoreChatService.syncUserProfile(fullUser);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      setUser(res.user);
      setToken(res.token);
      socket.authenticate(res.token);
      await FirestoreChatService.syncUserProfile(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCurrentUser = async (updates: Partial<User>) => {
    try {
      // 1. Update Firebase Authentication profile if user is signed in with Firebase
      if (auth.currentUser && (updates.avatarUrl !== undefined || updates.displayName !== undefined)) {
        try {
          await updateProfile(auth.currentUser, {
            displayName: updates.displayName !== undefined ? updates.displayName : auth.currentUser.displayName || undefined,
            photoURL: updates.avatarUrl !== undefined ? updates.avatarUrl : auth.currentUser.photoURL || undefined,
          });
        } catch (authErr) {
          console.warn('[Auth] Firebase updateProfile notice:', authErr);
        }
      }

      // 2. Sync with backend API
      try {
        await api.updateProfile(updates);
      } catch (apiErr) {
        console.warn('[Auth] Server profile update notice:', apiErr);
      }

      // 3. Update local state and Firestore
      if (user) {
        const merged = { ...user, ...updates, updatedAt: new Date().toISOString() } as User;
        setUser(merged);
        await FirestoreChatService.syncUserProfile(merged);
      }
    } catch (err) {
      console.error('[Auth] updateCurrentUser error:', err);
      throw err;
    }
  };

  const switchDemoUser = async (identifier: string) => {
    await login(identifier, 'password123');
  };

  const logout = () => {
    api.setToken(null);
    setToken(null);
    setUser(null);
    socket.disconnect();
    try {
      auth.signOut();
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithPhoneOtp,
        loginWithFirebaseToken,
        register,
        logout,
        updateCurrentUser,
        switchDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
