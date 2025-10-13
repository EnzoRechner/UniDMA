import { collection, addDoc, getDocs, query, where, Timestamp, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/services/firebase-service1';
import { UserProfile } from '@/app/lib/types';

export const createUserProfile = async (userId: string, profileData: Omit<UserProfile, 'id' | 'createdAt'>) => {
  try {
    await setDoc(doc(db, 'users', userId), {
      ...profileData,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as UserProfile;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const users: UserProfile[] = [];

    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data(),
      } as UserProfile);
    });

    return users.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};
export const updateUserRole = async (
  userId: string,
  role: 0 | 1 | 2 | 3,
  adminBranch?: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'users', userId);
    const updateData: Partial<UserProfile> = {
      role,
    };

    if (role === 2 && adminBranch) {
      // Store adminBranch as a normalized slug to make branch matching
      // consistent (e.g. 'Paarl' -> 'paarl')
      updateData.branch = adminBranch.toLowerCase().trim().replace(/\s+/g, '-');
    } else if (role === 0) {
      updateData.branch = undefined;
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};