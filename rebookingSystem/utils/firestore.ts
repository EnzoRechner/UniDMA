import { collection, addDoc, getDocs, query, where, Timestamp, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { ReservationDetails, UserProfile } from '@/lib/types';

export const addReservation = async (userId: string, reservationDetails: Omit<ReservationDetails, 'id' | 'createdAt' | 'status'>) => {
  try {
    const branchId = reservationDetails.branch
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');

    const docRef = await addDoc(collection(db, 'reservations'), {
      ...reservationDetails,
      branchId,
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
      collection(db, 'bookings'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const reservations: ReservationDetails[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('getReservationsByBranch: doc', doc.id, data);
      reservations.push({
        id: doc.id,
        ...data,
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

export const getReservationsByBranch = async (branch: string): Promise<ReservationDetails[]> => {
  try {
    // Normalize to a slug (branchId) and try querying by that first. This
    // handles cases where adminBranch is stored as a slug (e.g. 'paarl') while
    // older reservations stored the display name ('Paarl'). If the slug-query
    // returns no results, fall back to querying by the display name for
    // backward compatibility.
    const slug = branch.toLowerCase().trim().replace(/\s+/g, '-');

    // Try query by branchId
    let q = query(
      collection(db, 'bookings'),
      where('branchId', '==', slug)
    );

    let querySnapshot = await getDocs(q);
    const reservations: ReservationDetails[] = [];

    querySnapshot.forEach((doc) => {
      reservations.push({
        id: doc.id,
        ...doc.data(),
      } as ReservationDetails);
    });

    if (reservations.length > 0) {
      // Augment any reservations missing customerName by fetching the user's profile
      const augmented = await Promise.all(reservations.map(async (r) => {
        if ((!r.nagName || r.nagName === '') && (r.userId)) {
          try {
            const profile = await getUserProfile(r.userId);
            if (profile && profile.displayName) {
              r.nagName = profile.displayName;
            }
          } catch (err) {
            console.error('Error augmenting reservation with user profile:', err);
          }
        }
        return r;
      }));

      return augmented.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    }

    // Fallback: try matching display name (case-sensitive as stored)
    q = query(
      collection(db, 'bookings'),
      where('branch', '==', branch)
    );

    querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      reservations.push({
        id: doc.id,
        ...data,
      } as ReservationDetails);
    });

    // Augment fallback results as well
    const augmentedFallback = await Promise.all(reservations.map(async (r) => {
      if ((!r.nagName || r.nagName === '') && (r.userId)) {
        try {
          const profile = await getUserProfile(r.userId);
          if (profile && profile.displayName) {
            r.nagName = profile.displayName;
          }
        } catch (err) {
          console.error('Error augmenting reservation with user profile (fallback):', err);
        }
      }
      return r;
    }));
    return augmentedFallback.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  } catch (error) {
    console.error('Error getting reservations by branch:', error);
    throw error;
  }
};

export const updateReservationStatus = async (
  reservationId: string,
  status: 1 | 2,
  rejectionReason?: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'reservations', reservationId);

    const updateData: Partial<ReservationDetails> = {
      status,
    };

    if (status === 2 && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating reservation status:', error);
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
  role: 'user' | 'admin',
  adminBranch?: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'users', userId);
    const updateData: Partial<UserProfile> = {
      role,
    };

    if (role === 'admin' && adminBranch) {
      // Store adminBranch as a normalized slug to make branch matching
      // consistent (e.g. 'Paarl' -> 'paarl')
      updateData.adminBranch = adminBranch.toLowerCase().trim().replace(/\s+/g, '-');
    } else if (role === 'user') {
      updateData.adminBranch = undefined;
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};