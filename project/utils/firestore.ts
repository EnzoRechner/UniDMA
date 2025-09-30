import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface ReservationDetails {
  id?: string;
  name: string;
  date: string;
  time: string;
  guests: number;
  branch: string;
  seat: string;
  message?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: Timestamp;
}

export interface UserProfile {
  id?: string;
  displayName: string;
  email: string;
  preferredBranch: string;
  preferredSeating: string;
  createdAt: Timestamp;
}

export const addReservation = async (userId: string, reservationDetails: Omit<ReservationDetails, 'id' | 'createdAt' | 'status'>) => {
  try {
    const docRef = await addDoc(collection(db, 'reservations'), {
      ...reservationDetails,
      userId,
      status: 'pending',
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding reservation:', error);
    throw error;
  }
};

export const getReservations = async (userId: string): Promise<ReservationDetails[]> => {
  try {
    const q = query(
      collection(db, 'reservations'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const reservations: ReservationDetails[] = [];
    
    querySnapshot.forEach((doc) => {
      reservations.push({
        id: doc.id,
        ...doc.data(),
      } as ReservationDetails);
    });
    
    // Sort by createdAt in JavaScript instead of Firestore
    return reservations.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  } catch (error) {
    console.error('Error getting reservations:', error);
    throw error;
  }
};

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