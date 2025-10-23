import { collection, doc, orderBy, query, updateDoc, where, onSnapshot, Timestamp } from 'firebase/firestore';
// Removed User import as it's not strictly required by these functions, assuming it's imported where needed.
import { ReservationDetails } from '../lib/types'; 
import { db } from './firebase-initilisation';
import { getUserProfile } from './auth-service'

/**
 * Sets up a real-time listener for staff/admin bookings based on their role and status.
 * * @param {string} staffId - The staff/admin's ID.
 * @param {'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled'} status - The status filter.
 * @param {(bookings: ReservationDetails[]) => void} callback - The function to call with updated data.
 * @returns {() => void} - An unsubscribe function to stop the listener.
 */
export function onSnapshotStaffBookings(
    staffId: string, 
    status: 0 | 1 | 2 | 3 | 4,
    callback: (bookings: ReservationDetails[]) => void
): () => void {
    let unsubscribe = () => {}; // Default placeholder unsubscribe function

    const setupListener = async () => {
        try {
            // Note: getUserProfile might return a Promise<StaffData | null>
            const staffData = await getUserProfile(staffId); 

            if (staffData == null) {
                console.error(`Staff document with ID ${staffId} not found.`);
                callback([]);
                return;
            }

            // Type assertions/checks are needed here for a real implementation
            const staffBranch = staffData.branch;
            const staffRestaurant = staffData.restaurant;
            const staffRole = staffData.role;

            if (staffBranch === null || staffBranch === undefined || staffRestaurant === null || staffRestaurant === undefined) {
                console.error("Staff document is missing branch or restaurant data.");
                callback([]);
                return;
            }
            
            const now = Timestamp.now(); 
            const bookingsCollectionRef = collection(db, 'nagbookings');
            
            // --- Query Logic ---
            let queryConstraints = [
                where('status', '==', status), 
                where('dateOfArrival', '>', now) 
            ];

            // Role-based filtering:
            if (staffRole === 3) { // Super Admin: Filter by Restaurant
                queryConstraints.push(where('restaurant', '==', staffRestaurant));
            } else if (staffRole === 1 || staffRole === 2) { // Staff: Filter by Branch
                queryConstraints.push(where('branch', '==', staffBranch));
            } else {
                console.warn(`User ${staffId} has invalid role: ${staffRole}. No bookings fetched.`);
                callback([]);
                return;
            }

            const bookingsQuery = query(
                bookingsCollectionRef,
                ...queryConstraints,
                orderBy('dateOfArrival', 'asc') // Changed to asc for chronological order
            );
            // -------------------------

            // 1. Establish the Real-Time Listener
            unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
                
                const bookings = snapshot.docs.map(doc => ({
                    ...doc.data() as Omit<ReservationDetails, 'id'>,
                    id: doc.id,
                }) as ReservationDetails);
                
                // 2. Deliver data to the callback
                callback(bookings);
                
            }, (error) => {
                console.error("Error listening to staff bookings:", error);
                callback([]); 
            });

        } catch (error) {
            console.error("Error setting up staff booking listener:", error);
            callback([]);
        }
    };

    setupListener();

    // Return the unsubscribe function handle
    return () => unsubscribe();
}

/**
 * Update the status of a booking on the firebase side.
 * @param {string} reservationId - The id of the booking.
 * @param {'1':'confirmed' | '2':'cancelled'} status - The new status string.
 * @param {string} rejectionReason - The reason the booking was rejected
 * @returns {Promise<void>}
 */
export const updateReservationStatus = async (
  reservationId: string,
  status: 1 | 2, // 1 = confirmed, 2 = rejected
  rejectionReason?: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'nagbookings', reservationId);

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

export default {};