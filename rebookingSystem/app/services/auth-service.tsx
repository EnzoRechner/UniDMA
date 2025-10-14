import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  doc,
  setDoc,
  getDoc,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase-initilisation';
import { UserProfile, RoleId, BranchId } from '../lib/types';
import { ROLES } from '../lib/types';

/**
 * Generates a unique random 6-digit string to be used as a document ID.
 */
const generateUniqueUserId = async (): Promise<string> => {
  let isUnique = false;
  let userId = '';
  while (!isUnique) {
    userId = Math.floor(100000 + Math.random() * 900000).toString();
    const userDocRef = doc(db, 'rebooking-accounts', userId);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
      isUnique = true;
    }
  }
  return userId;
};

/**
 * Signs up a new user by creating a document in the 'rebooking-accounts' collection.
 */
export const signUp = async (
  email: string,
  password: string,
  nagName: string,
  branch: BranchId
): Promise<UserProfile> => {
  // Check if email already exists
  const emailQuery = query(collection(db, 'rebooking-accounts'), where('email', '==', email));
  const emailQuerySnapshot = await getDocs(emailQuery);
  if (!emailQuerySnapshot.empty) {
    throw new Error('An account with this email already exists.');
  }

  const newUserId = await generateUniqueUserId();

  const userProfile: UserProfile = {
    userId: newUserId,
    nagName,
    email,
    password, // WARNING: Storing plain-text password
    branch,
    role: ROLES.CUSTOMER, // Assign customer role
    createdAt: Timestamp.now(),
  };

  // Create the document with the 6-digit ID
  await setDoc(doc(db, 'rebooking-accounts', newUserId), userProfile);
  
  // Save the new 6-digit user ID to storage to log them in
  await AsyncStorage.setItem('userId', newUserId);
  
  return userProfile;
};

/**
 * Signs in a user by manually checking their email and password.
 */
export const signIn = async (email: string, password: string): Promise<UserProfile> => {
  const q = query(collection(db, "rebooking-accounts"), where("email", "==", email));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error("Invalid email or password.");
  }

  const userDoc = querySnapshot.docs[0];
  const userData = userDoc.data() as UserProfile;

  if (userData.password !== password) {
    throw new Error("Invalid email or password.");
  }
  
  // Save the document ID (the 6-digit userId) to storage
  const userId = userDoc.id;
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

// Default export to prevent Expo Router warnings
export default {};
