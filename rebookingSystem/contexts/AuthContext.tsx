import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { createUserProfile, getUserProfile } from '@/dataconnect/firestoreUsers';
import { UserProfile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  adminBranch: string | null;
  loading: boolean;
  signUp: (email: string, password: string, nagName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<UserProfile | null>;
  updateUserProfile: (profileData: Omit<UserProfile, 'id' | 'createdAt'>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminBranch, setAdminBranch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
            // Check if user is admin and set admin state
            if (profile.role === 2) {
              setIsAdmin(true);
              // Normalize stored adminBranch to a slug for consistent matching
              const normalized = profile.branch
                ? profile.branch.toLowerCase().trim().replace(/\s+/g, '-')
                : null;
              setAdminBranch(normalized || null);
            } else {
              setIsAdmin(false);
              setAdminBranch(null);
            }
          } else {
            setUserProfile(null);
            setIsAdmin(false);
            setAdminBranch(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setIsAdmin(false);
          setAdminBranch(null);
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
        setAdminBranch(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string, nagName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name
      await updateProfile(result.user, {
        displayName: nagName
      });

      // User needs to complete profile setup (branch selection)
      setUserProfile(null);
    } catch (error: any) {
      console.error('Error creating account:', error);
      throw new Error(error.message || 'Failed to create account. Please try again.');
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      // Wait for profile to be loaded
      const profile = await getUserProfile(result.user.uid);
      if (profile) {
        setUserProfile(profile);
        if (profile.role === 2) {
          setIsAdmin(true);
          setAdminBranch(profile.branch || null);
        }
      }
      return profile;
    } catch (error: any) {
      console.error('Error signing in:', error);
      throw new Error(error.message || 'Failed to sign in. Please check your credentials.');
    }
  };

  const updateUserProfile = async (profileData: Omit<UserProfile, 'id' | 'createdAt'>) => {
    if (!user) throw new Error('No authenticated user');
    
    await createUserProfile(user.uid, profileData);
    const updatedProfile = await getUserProfile(user.uid);
    setUserProfile(updatedProfile);
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  const value = {
    user,
    userProfile,
    isAdmin,
    adminBranch,
    loading,
    signUp,
    signIn,
    updateUserProfile,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};