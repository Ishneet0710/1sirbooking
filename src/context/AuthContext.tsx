
"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Assuming auth is exported from your firebase setup
import { ADMIN_UIDS } from '@/config/admin'; // Import ADMIN_UIDS from config

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        console.log("AuthContext: Current user UID:", currentUser.uid); // For debugging
        if (ADMIN_UIDS.length === 0 || (ADMIN_UIDS.length === 1 && ADMIN_UIDS[0] === "YOUR_ADMIN_FIREBASE_UID_HERE")) {
          console.warn("AuthContext: ADMIN_UIDS is empty or contains only the default placeholder. isAdmin will be false unless UIDs are correctly set.");
        }
        setIsAdmin(ADMIN_UIDS.includes(currentUser.uid));
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = { user, loading, isAdmin };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
