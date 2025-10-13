import { collection, doc, getDoc, getDocs, query, setDoc, where, updateDoc } from 'firebase/firestore';
import { db } from '@/app/services/firebase-service2';
import { UserProfile } from '@/app/lib/types';

// Utility function to generate a random 6-digit ID
function generateRandomId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Signs up a new user and stores their data in Firestore.
 * @param {string} email - The user's email address.
 * @param {string} password - The user's password.
 * @param {string} nagName - The user's preferred name.
 * @param {string} dob - The user's date of birth.
 * @returns {Promise<{success: boolean, message: string}>} - An object indicating the sign-up result.
 */
export async function signUpUser(email: string, password: string, nagName: string, dob: string): Promise<{ success: boolean; message: string; userId?: string; }> {
  try {
    const q = query(
      collection(db, 'users'),
      where('email', '==', email)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return { success: false, message: 'Email already exists.' };
    }

    const newUserId = generateRandomId();
    await setDoc(doc(db, 'users', newUserId), {
      email,
      password, // In a real app, hash this password
      nagName,
      DOB: dob,
      role: 0,
    });

    return { success: true, message: 'Sign up successful!', userId: newUserId };
  } catch (error) {
    console.error('Sign Up failed:', error);
    return { success: false, message: 'Failed to sign up. Please try again later.' };
  }
}

/**
 * Logs in a user by checking their email and password against the 'users' collection.
 * @param {string} email - The user's email address.
 * @param {string} password - The user's password.
 * @returns {Promise<{success: boolean, message: string, userId?: string, role?: number}>} - An object indicating the login result and user data if successful.
 */
export async function loginUser(email: string, password: string): Promise<{ success: boolean; message: string; userId?: string; role?: number; }> {
  try {
    const q = query(
      collection(db, 'users'),
      where('email', '==', email)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, message: 'Invalid email or password.' };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() as User;

    if (userData.password === password) {
      return {
        success: true,
        message: 'Login successful!',
        userId: userDoc.id,
        role: userData.role,
      };
    } else {
      return { success: false, message: 'Invalid email or password.' };
    }
  } catch (error) {
    console.error('Login failed:', error);
    return { success: false, message: 'Failed to login. Please try again later.' };
  }
}

/**
 * Fetches a single user's data from Firestore by document ID.
 * @param {string} userId - The ID of the user document.
 * @returns {Promise<User | null>} - The user object or null if not found.
 */
export async function fetchUserData(userId: string): Promise<User | null> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return userDoc.data() as User;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}