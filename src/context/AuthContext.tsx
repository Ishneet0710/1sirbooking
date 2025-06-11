
"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Assuming auth is exported from your firebase setup

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean; // We can add a placeholder for isAdmin, actual check will be complex
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); // Placeholder

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      // Placeholder for admin check. In a real app, you might fetch user roles
      // or check against a known admin UID (ideally via a custom claim).
      // For now, this is just a client-side indicator and NOT for security.
      // The true security for "only admin can delete" comes from Firestore Rules.
      if (currentUser) {
        // Example: Check if the user's UID matches a hardcoded admin UID
        // const ADMIN_UID = "YOUR_ADMIN_UID_HERE"; // Replace with your actual Admin UID
        // setIsAdmin(currentUser.uid === ADMIN_UID);
        setIsAdmin(false); // Default to false; you need to implement your admin check
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
