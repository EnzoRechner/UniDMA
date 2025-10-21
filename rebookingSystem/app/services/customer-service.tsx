import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
  collection,
  updateDoc, // Import updateDoc
} from 'firebase/firestore';
import { db } from './firebase-initilisation';
import { ReservationDetails, UserProfile, BranchId, BRANCHES } from '../lib/types';
// Local mapping from BranchId to human-readable name for notifications
const branchNameMap: Record<BranchId, string> = {
  [BRANCHES.PAARL]: 'Paarl',
  [BRANCHES.BELLVILLE]: 'Bellville',
  [BRANCHES.SOMERSET_WEST]: 'Somerset West',
};

/**
 * Generates a unique random 6-digit string ID for a new booking.
 */
const generateUniqueBookingId = async (): Promise<string> => {
    let isUnique = false;
    let bookingId = '';
    while (!isUnique) {
      bookingId = Math.floor(100000 + Math.random() * 900000).toString();
      const docRef = doc(db, 'nagbookings', bookingId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        isUnique = true;
      }
    }
    return bookingId;
};


/**
 * Fetches a user's profile from the 'rebooking-accounts' collection.
 * @param {string} userId - The 6-digit user ID.
 * @returns {Promise<UserProfile | null>}
 */
export const fetchUserData = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, 'rebooking-accounts', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
};

/**
 * Creates a new reservation in the 'nagbookings' collection.
 * @param {Omit<ReservationDetails, 'id' | 'createdAt' | 'status'>} reservationData
 * @returns {Promise<string>} - The ID of the new booking.
 */
export const addReservation = async (
  reservationData: Omit<ReservationDetails, 'id' | 'createdAt' | 'status'>
): Promise<string> => {
  try {
    const newBookingId = await generateUniqueBookingId();
    const docRef = doc(db, 'nagbookings', newBookingId);

    await setDoc(docRef, {
      ...reservationData,
      id: newBookingId,
      status: 0, // Default to 'pending'
      createdAt: Timestamp.now(),
    });
    // Fire-and-forget staff notification about a new booking
    try {
      const NotificationService = (await import('./notifications')).default;
      const numericBranchId = reservationData.branch as BranchId;
      const branchName = branchNameMap[numericBranchId] ?? String(reservationData.branch);

      await NotificationService.sendNewBookingNotificationToStaff(
        branchName,
        newBookingId,
        {
          customerName: reservationData.bookingName || reservationData.message || 'Customer',
          customerId: reservationData.userId || 'unknown',
          date: reservationData.date || (reservationData as any).dateOfArrival?.toDate?.().toISOString()?.slice(0,10) || '',
          time: reservationData.time || '',
          guests: reservationData.guests,
          message: reservationData.message,
        },
        numericBranchId
      );
    } catch (notifError) {
      console.error('Error sending staff notification:', notifError);
    }

    return newBookingId;
  } catch (error) {
    console.error('Error adding reservation:', error);
    throw error;
  }
};

/**
 * Sets up a real-time listener for a customer's reservations from 'nagbookings'.
 * @param {string} userId - The 6-digit user ID.
 * @param {(reservations: ReservationDetails[]) => void} callback
 * @returns {() => void} - An unsubscribe function.
 */
export const getReservationsRealtime = (
  userId: string,
  callback: (reservations: ReservationDetails[]) => void
): (() => void) => {
  const q = query(
    collection(db, 'nagbookings'),
    where('userId', '==', userId),
    orderBy('dateOfArrival', 'desc') // Show most recent bookings first
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const reservations = snapshot.docs.map(doc => doc.data() as ReservationDetails);
      // Filter out already cancelled bookings from the main view
      const activeReservations = reservations.filter(r => r.status !== 4);
      callback(activeReservations);
    },
    (error) => {
      console.error("Error listening to reservations:", error);
      callback([]);
    }
  );

  return unsubscribe;
};

/**
 * Marks a reservation as cancelled in the 'nagbookings' collection.
 * @param {string} bookingId - The ID of the booking to cancel.
 * @returns {Promise<void>}
 */
export const cancelReservation = async (bookingId: string): Promise<void> => {
    try {
        const bookingDocRef = doc(db, 'nagbookings', bookingId);
        // Status 4 is 'cancelled'
        await updateDoc(bookingDocRef, { status: 4 });
    } catch (error) {
        console.error("Error cancelling reservation:", error);
        throw error;
    }
};

export default {};