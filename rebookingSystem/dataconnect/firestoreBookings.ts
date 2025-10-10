import { addDoc, collection, doc, getDocs, orderBy, query, updateDoc, where, onSnapshot, getDoc, Timestamp } from 'firebase/firestore';
// Removed User import as it's not strictly required by these functions, assuming it's imported where needed.
import { Staff, ReservationDetails } from '../lib/types'; 
import { db } from '../config/initialiseFirebase';
import { Alert } from 'react-native';

/**
 * Creates a new Reservation document in Firestore.
 * @param reservationDetails - The partial booking data.
 * @param userId - The ID of the customer making the booking.
 * @returns The newly created Booking object.
 */
export const addReservation = async (userId: string, reservationDetails: Omit<ReservationDetails, 'id' | 'createdAt' | 'status'>) => {
  try {
    reservationDetails.branch = reservationDetails.branch
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');

    const docRef = await addDoc(collection(db, 'reservations'), {
      ...reservationDetails,
      userId,
      status: '0',
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding reservation:', error);
    throw error;
  }
};

/**
 * Sets up a real-time listener for a customer's bookings.
 * * @param {string} userId - The ID of the customer.
 * @param {(reservations: ReservationDetails[]) => void} callback - The function to call with updated data.
 * @returns {() => void} - An unsubscribe function to stop the listener.
 */
export function getReservationsRealtime(
  userId: string, 
  callback: (reservations: ReservationDetails[]) => void
): () => void {
  
  const q = query(
    collection(db, 'reservations'), // Assumed collection name is 'bookings'
    where('userId', '==', userId),
    orderBy('createdAt', 'desc') // Added orderBy for consistency/relevance
  );

  // 1. Establish the real-time listener using onSnapshot
  const unsubscribe = onSnapshot(q, (snapshot) => {
    
    // 2. Map and process the incoming data stream
    const reservations = snapshot.docs.map(doc => ({
      // Cast the data to the correct type structure
      ...doc.data() as Omit<ReservationDetails, 'id'>, 
      id: doc.id,
    }) as ReservationDetails);

    // 3. Pass the fresh data to the calling component via callback
    callback(reservations);

  }, (error) => {
    console.error("Error listening to user reservations:", error);
    // Optional: Call the callback with an empty array or handle error state
    callback([]); 
  });

  // 4. Return the unsubscribe function for cleanup
  return unsubscribe;
}

/**
 * Sets up a call to user's bookings, ordered by creation date descending.
 * @param userId - The ID of the customer.
 * @param callback - Function to handle the updated list of bookings.
 * @returns Get the reservation details for a user.
 */
export const getReservations = async (userId: string): Promise<ReservationDetails[]> => {
  try {
    const q = query(
      collection(db, 'reservations'),
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


/**
 * Creates a new booking document in Firestore.
 * @param booking - The partial booking data.
 * @param userId - The ID of the customer making the booking.
 * @returns The newly created Booking object.
 */
// export async function createBooking(
//   booking: Omit<ReservationDetails, 'id' | 'status' | 'createdAt' | 'userId' | 'custId'>,
//   userId: string,
//   custId: string 
// ): Promise<ReservationDetails> {
  
//   const nowTimestamp = Timestamp.now();

//   const bookingData = {
//     ...booking,
//     userId: userId, 
//     custId: custId, 
//     status: '0' as const,
//     createdAt: nowTimestamp,
//   };

//   const colRef = collection(db, 'bookings');
//   const docRef = await addDoc(colRef, bookingData as unknown as Omit<ReservationDetails, 'id'>);
  
//   return { id: docRef.id, ...bookingData } as ReservationDetails;
// }

/**
 * Sets up a real-time listener for a user's bookings, ordered by creation date descending.
 * @param userId - The ID of the customer.
 * @param callback - Function to handle the updated list of bookings.
 * @returns A function to unsubscribe from the listener.
 */
// export function onSnapshotUserBookings(userId: string, callback: (bookings: ReservationDetails[]) => void) {
//   const q = query(
//     collection(db, 'bookings'),
//     where('userId', '==', userId),
//     orderBy('createdAt', 'desc')
//   );

//   const unsubscribe = onSnapshot(q, (snapshot) => {
//     const bookings = snapshot.docs.map(doc => ({
//       // Cast the data to the correct Booking type structure
//       ...doc.data() as Omit<ReservationDetails, 'id'>, 
//       id: doc.id,
//     }) as ReservationDetails);
//     callback(bookings);
//   }, (error) => {
//     console.error("Error listening to user bookings:", error);
//     // You might want to pass the error to the callback or handle it in the calling component
//     callback([]); 
//   });

//   return unsubscribe;
// }

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
            const staffDocRef = doc(db, 'users', staffId);
            const staffDoc = await getDoc(staffDocRef);

            if (!staffDoc.exists()) {
                console.error(`Staff document with ID ${staffId} not found.`);
                callback([]);
                return;
            }

            const staffData = staffDoc.data() as Staff;
            const staffBranch = staffData.branch;
            const staffRestaurant = staffData.restaurant;
            const staffRole = staffData.role;

            if (!staffBranch || !staffRestaurant) {
                console.error("Staff document is missing branch or restaurant data.");
                callback([]);
                return;
            }
            
            const now = Timestamp.now(); 
            const bookingsCollectionRef = collection(db, 'reservations');
            
            // --- Query Logic Fix ---
            let queryConstraints = [
                where('status', '==', status), 
                where('dateOfArrival', '>', now) 
            ];
            
            // Role-based filtering:
            if (staffRole === 2) { // Admin: Filter by Restaurant
                queryConstraints.push(where('restaurant', '==', staffRestaurant));
            } else if (staffRole === 1) { // Staff: Filter by Branch
                queryConstraints.push(where('branch', '==', staffBranch));
            } else {
                console.warn(`User ${staffId} has invalid role: ${staffRole}. No bookings fetched.`);
                callback([]);
                return;
            }

            const bookingsQuery = query(
                bookingsCollectionRef,
                ...queryConstraints,
                orderBy('createdAt', 'desc') // Order by creation date descending
            );
            // -------------------------

            // 1. Establish the Real-Time Listener
            unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
                
                const bookings = snapshot.docs.map(doc => ({
                    ...doc.data() as Omit<ReservationDetails, 'id'>,
                    id: doc.id,
                }) as ReservationDetails);

                console.log(`Fetched ${bookings.length} bookings for staff ID ${staffId} with status ${status}.`);
                // 2. Deliver data to the callback
                callback(bookings); // Keep the slice(0, 5) logic if you only want the top 5 
                
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
 * Fetches the most recent bookings for a certain branch.
 * @param {string} staffId - The staff's ID.
 * @param {'pending' | 'confirmed' | reject | completed | 'cancelled'} statusString - The status string.
 * @returns {Promise<ReservationDetails[]>} - A list of the latest bookings.
 */
// export async function fetchStaffLatestBookings(staffId: string, status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled'): Promise<ReservationDetails[]> {
//   try {
//     const staffDocRef  = doc(db, 'users', staffId);
//     const staffDoc = await getDoc(staffDocRef );

//     if (!staffDoc.exists()) {
//       return [];
//     }

//     const staffData = staffDoc.data() as Staff;
//     const staffBranch = staffData.branch;
//     const staffRestaurant = staffData.restaurant; // <-- NEW: Get restaurant ID
//     const staffRole = staffData.role; // Assuming you have a role field

//     if (!staffBranch) {
//       console.error("Staff document is missing 'branch' or 'restaurant'.");
//       return [];
//     }
    
//     // 1. Get the current date and time as a Firestore Timestamp
//     const now = Timestamp.now(); 
//     const statusCode = STATUS_CODES[status]; // <-- NEW: Get integer status code

//     const bookingsCollectionRef = collection(db, 'reservations');

//     // Base queries array
//     let queryConstraints = [
//         where('status', '==', statusCode), // Filter by integer status code
//         where('dateOfArrival', '>', now)   // Filter for future bookings
//     ];

//     queryConstraints.push(where('branch', '==', staffBranch));
//         // full Admin logic:
//         if (staffRole === 2) { // Role 2 Admin
//           queryConstraints.push(where('restaurant', '==', staffRestaurant));
//         } else {
//           if (staffRole === 1) { // Role 1 Staff
//             queryConstraints.push(where('branch', '==', staffBranch));
//           } 
//         }

//     const bookingsQuery = query(
//         bookingsCollectionRef,
//         ...queryConstraints 
//     );

//     const querySnapshot = await getDocs(bookingsQuery);

//     if (querySnapshot.empty) {
//       return [];
//     }
    
//     // Map and transform data
//     const bookings = querySnapshot.docs.map(doc => ({
//       ...doc.data() as Omit<ReservationDetails, 'id'>,
//       id: doc.id,
//     }));

//     bookings.sort((a, b) => {
//       // Assert that 'createdAt' is a Firestore Timestamp object
//       const aTime = (a.createdAt as Timestamp).toDate().getTime();
//       const bTime = (b.createdAt as Timestamp).toDate().getTime();
      
//       return bTime - aTime;
//   });

//     // Return the top 5
//     return bookings.slice(0, 5)
//   } catch (error) {
//     console.error("Error fetching latest bookings:", error);
//     return [];
//   }
// }

/**
 * Update the status of a booking on the firebase side.
 * @param {string} id - The id of the booking.
 * @param {'confirmed' | 'cancelled'} statusString - The new status string.
 * @returns {Promise<void>}
 */
export const updateStatus = async (id: string, statusString: 1 | 2 | 3 | 4): Promise<void> => {
    try {

        await updateDoc(doc(db, 'reservations', id), { status: statusString });
        
    } catch (error) {
        Alert.alert('Error', 'Failed to update booking status. Permission denied or invalid ID.');
        console.error('Firestore update error:', error);
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