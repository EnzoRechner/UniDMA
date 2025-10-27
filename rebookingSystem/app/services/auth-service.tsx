import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, where, Timestamp, doc, setDoc, getDoc, documentId, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut as fbSignOut } from 'firebase/auth';
import { auth, db } from './firebase-initilisation';
import { UserProfile } from '../lib/types';
import { ROLES, BranchId } from '../lib/typesConst';

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
  const profileDocRef = doc(db, 'rebooking-accounts', cred.user.uid);
  await setDoc(profileDocRef, { ...baseProfile } as any);

  // Persist identifiers locally: use Firebase UID as canonical userId, and store the 6-digit as customerId
  await AsyncStorage.setItem('userId', cred.user.uid);
  await AsyncStorage.setItem('customerId', newUserId);

  // Try to register device for push notifications (best-effort)
  try {
    const NotificationService = (await import('./notifications')).default;
    await NotificationService.registerForPushNotifications(cred.user.uid);
  } catch (err) {
    console.log('Failed to register for push notifications:', err);
  }

  return cred.user.uid;
};

/**
 * Sign in with Firebase Auth and return the associated Firestore profile.
 * Also stores the 6-digit userId to AsyncStorage for existing flows.
 */
export const signIn = async (email: string, password: string): Promise<UserProfile> => {
  // Authenticate with Firebase
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  let userDoc: any = null;
  let userId: string;
  let userData: UserProfile;

  // 1. Try to find profile by UID (document ID)
  let q = query(collection(db, 'rebooking-accounts'), where(documentId(), '==', uid));
  let snapshot = await getDocs(q);

  if (!snapshot.empty) {
    // Found by UID - All good.
    userDoc = snapshot.docs[0];
    userId = userDoc.id;
    userData = userDoc.data() as UserProfile;

  } else {
    // Lookup by email
    q = query(collection(db, 'rebooking-accounts'), where('email', '==', email));
    snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // Found by Email - Migrate the document ID to the UID.
      const oldDoc = snapshot.docs[0];
      const docIdToMigrate = oldDoc.id;
      const dataToMigrate = oldDoc.data() as any;

      if ('firebaseUid' in dataToMigrate) {
          const cleanData = { ...dataToMigrate };
          delete (cleanData as any).firebaseUid;
          userData = cleanData;
      } else {
          userData = dataToMigrate;
      }

      const newDocRef = doc(db, 'rebooking-accounts', uid);
      await setDoc(newDocRef, dataToMigrate);

      // Delete the OLD document found by email
      const oldDocRef = doc(db, 'rebooking-accounts', docIdToMigrate);
      await deleteDoc(oldDocRef);
      
      // Update variables to reflect the new document
      userId = uid; // The new ID is the Firebase UID
      userData = dataToMigrate; // The data remains the same

    } else {
      // Case 3: Not found by UID or Email
      throw new Error('User profile not found. Please complete setup or contact support.');
    }
  }

  // Final actions after successful lookup/migration
  await AsyncStorage.setItem('userId', userId);
  await AsyncStorage.setItem('userRole', userData.role.toString());

  // Best-effort: ensure device token registration on sign in as well
  try {
    const NotificationService = (await import('./notifications')).default;
    await NotificationService.registerForPushNotifications(userId);
  } catch (err) {
    console.log('Failed to (re)register for push notifications on sign-in:', err);
  }

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
  // Attempt to deactivate active device tokens for this user
  try {
    const currentUserId = await AsyncStorage.getItem('userId');
    if (currentUserId) {
      const NotificationService = (await import('./notifications')).default;
      await NotificationService.unregisterPushNotifications(currentUserId);
    }
  } catch (err) {
    console.log('Failed to unregister push notifications on sign-out:', err);
  }

  await fbSignOut(auth);
  await AsyncStorage.removeItem('userId');
};

// Default export to prevent Expo Router warnings
export default {};
