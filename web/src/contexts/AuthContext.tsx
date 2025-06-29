import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from '../config/firebase';
import apiClient from '@/services/apiService';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextProps {
  currentUser: User | null;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Sign up function
  const signUp = async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });

    // After profile is created in Firebase, we need to get a token and update our own backend.
    const token = await userCredential.user.getIdToken();
    // Use a temporary apiClient instance with the new token to update the user profile
    // This ensures the correct token is used immediately after signup.
    await apiClient.put('/users/me', { full_name: displayName }, {
        headers: { Authorization: `Bearer ${token}` }
    });
    // Manually update the currentUser state to reflect the new display name
    // as onAuthStateChanged might not pick it up immediately.
    setCurrentUser(auth.currentUser);
  };

  // Login function
  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  // Logout function
  const logout = async () => {
    await signOut(auth);
    queryClient.clear();
  };

  // Reset password function
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  // Update user profile
  const updateUserProfile = async (displayName: string) => {
    if (auth.currentUser) {
      // Update firebase profile
      await updateProfile(auth.currentUser, { displayName });
      // Update our backend
      await apiClient.put('/users/me', { full_name: displayName });
      // Manually update state to trigger re-render
      setCurrentUser(auth.currentUser);
    }
  };

  // Set up auth state observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signUp,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
