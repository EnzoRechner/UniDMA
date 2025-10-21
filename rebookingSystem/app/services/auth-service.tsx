import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, getDocs, query, where, Timestamp, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut as fbSignOut } from 'firebase/auth';
import { auth, db } from './firebase-initilisation';
import { UserProfile } from '../lib/types';
import { BRANCHES, ROLES, BranchId } from '../lib/typesConst';

/**
 * Generates a unique random 6-digit string to be used as a document ID.
 */
export const generateUniqueCustomerID = async (): Promise<string> => {
  const MAX_RETRIES = 50;
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    const randomNumber = Math.floor(Math.random() * 1000000);
    const customerID = randomNumber.toString().padStart(6, '0');

    try {
      const q = query(collection(db, 'rebooking-accounts'), where('customerID', '==', customerID));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return customerID;
      }

      attempts++;
    } catch (error) {
      console.error('Error checking customer ID uniqueness:', error);
      throw new Error('Failed to generate unique customer ID. Please try again.');
    }
  }

  throw new Error('Unable to generate unique customer ID after maximum attempts. Please try again.');
};

/**
 * Sign up a new user using Firebase Authentication and create a corresponding
 * profile document in 'rebooking-accounts' with a unique 6-digit userId.
 * Returns the 6-digit customerID for navigation/usage.
 */
export const signUp = async (
  email: string,
  password: string,
  nagName: string,
  branch: BranchId
): Promise<string> => {
  // Create Firebase Auth user (enforces unique email)
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  // Update display name for convenience
  try {
    await updateProfile(cred.user, { displayName: nagName });
  } catch {
    // Non-fatal if updateProfile fails; continue
  }

  // Generate unique 6-digit customerID
  const newUserId = await generateUniqueCustomerID();

  // Build Firestore profile (do NOT store plain-text password)
  const baseProfile: UserProfile = {
    userId: newUserId,
    nagName,
    email,
    branch,
    restaurant: 0,
    role: ROLES.CUSTOMER,
    createdAt: Timestamp.now(),
  };

  // Persist profile; include firebaseUid as extra field for lookup
  const profileDocRef = doc(db, 'rebooking-accounts', newUserId);
  await setDoc(profileDocRef, { ...baseProfile, firebaseUid: cred.user.uid } as any);

  // Persist the 6-digit ID locally (existing app logic expects this)
  await AsyncStorage.setItem('userId', newUserId);

  return newUserId;
};

/**
 * Sign in with Firebase Auth and return the associated Firestore profile.
 * Also stores the 6-digit userId to AsyncStorage for existing flows.
 */
export const signIn = async (email: string, password: string): Promise<UserProfile> => {
  // Authenticate with Firebase
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  // First, try to find profile by firebaseUid
  let q = query(collection(db, 'rebooking-accounts'), where('firebaseUid', '==', uid));
  let snapshot = await getDocs(q);

  // Fallback: legacy lookup by email (if profile was created before adding firebaseUid)
  if (snapshot.empty) {
    q = query(collection(db, 'rebooking-accounts'), where('email', '==', email));
    snapshot = await getDocs(q);
  }

  if (snapshot.empty) {
    throw new Error('User profile not found. Please complete setup or contact support.');
  }

  const userDoc = snapshot.docs[0];
  const userId = userDoc.id;
  const userData = userDoc.data() as UserProfile;

  await AsyncStorage.setItem('userId', userId);

  return { ...userData, userId };
};

/**
 * Fetches the user profile from Firestore using the 6-digit userId.
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const docRef = doc(db, 'rebooking-accounts', userId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
};

/**
 * Sign out the current user and clear local cached userId.
 */
export const signOut = async (): Promise<void> => {
  await fbSignOut(auth);
  await AsyncStorage.removeItem('userId');
};

// Default export to prevent Expo Router warnings
export default {};
