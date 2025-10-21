import {
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
  collection,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase-initilisation';
import { ReservationDetails, UserProfile } from '../lib/types';
import { BranchId } from '../lib/typesConst';

/**
 * Fetches a staff/admin user's profile from the 'rebooking-accounts' collection.
 * @param {string} userId - The 6-digit user ID.
 * @returns {Promise<UserProfile | null>}
 */
export const getStaffUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, 'rebooking-accounts', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching staff user data:", error);
    throw error;
  }
};

/**
 * Sets up a real-time listener for bookings at a specific branch, filtered by status.
 * @param {BranchId} branchId - The numerical ID of the branch (e.g., 0 for Paarl).
 * @param {0 | 1 | 2} status - The status of bookings to listen for (0: pending, 1: confirmed, 2: rejected).
 * @param {(reservations: ReservationDetails[]) => void} callback - The function to call with new data.
 * @returns {() => void} - An unsubscribe function.
 */
export const onSnapshotStaffBookings = (
  branchId: BranchId,
  status: 0 | 1 | 2,
  callback: (reservations: ReservationDetails[]) => void
): (() => void) => {
  const q = query(
    collection(db, 'nagbookings'),
    where('branch', '==', branchId),
    where('status', '==', status),
    orderBy('dateOfArrival', 'asc') // Show the soonest bookings first
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const reservations = snapshot.docs.map(doc => doc.data() as ReservationDetails);
      callback(reservations);
    },
    (error) => {
      console.error(`Error listening to bookings with status ${status}:`, error);
      callback([]);
    }
  );

  return unsubscribe;
};

/**
 * Updates the status of a specific booking in the 'nagbookings' collection.
 * @param {string} bookingId - The 6-digit ID of the booking document.
 * @param {1 | 2} newStatus - The new status to set (1: confirmed, 2: rejected).
 * @returns {Promise<void>}
 */
export const updateBookingStatus = async (bookingId: string, newStatus: 1 | 2): Promise<void> => {
    try {
        const bookingDocRef = doc(db, 'nagbookings', bookingId);
        await updateDoc(bookingDocRef, { status: newStatus });
    } catch (error) {
        console.error("Error updating booking status:", error);
        throw error;
    }
};


export default {};
