import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc, where, onSnapshot } from 'firebase/firestore';
// Removed User import as it's not strictly required by these functions, assuming it's imported where needed.
import { Booking } from '../lib/types'; 
import { db } from '../config/initialiseFirebase';

// Login: returns userId if found, null otherwise
export async function login(email: string, password: string): Promise<{ userId: string | null, role: 'customer' | '1' | '2' | null }> {
  const checkCollection = async (colName: string) => {
    const q = query(
      collection(db, colName),
      where('email', '==', email),
      where('password', '==', password)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }
    return null;
  };
  const customerId = await checkCollection('customer');
  if (customerId) return { userId: customerId, role: 'customer' };
  const staffId = await checkCollection('1');
  if (staffId) return { userId: staffId, role: '1' };
  return { userId: null, role: null };
}

// Create a document in a collection
export async function createDoc(collectionName: string, data: any) {
  const colRef = collection(db, collectionName);
  const docRef = await addDoc(colRef, data);
  return docRef.id;
}

// Read documents from a collection with optional filters
export async function readDocs(collectionName: string, filters?: { field: string, op: any, value: any }[]) {
  const colRef = collection(db, collectionName);
  let q: any = colRef;
  if (filters && filters.length > 0) {
    const qFilters = filters.map(f => where(f.field, f.op, f.value));
    q = query(colRef, ...qFilters);
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return { id: doc.id, ...(typeof data === 'object' && data !== null ? data : {}) };
  });
}

// Update a document by id
export async function updateDocById(collectionName: string, docId: string, data: any) {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, data);
}

// Delete a document by id
export async function deleteDocById(collectionName: string, docId: string) {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}

// --- Booking-specific CRUD ---

/**
 * Creates a new booking document in Firestore.
 * @param booking - The partial booking data.
 * @param userId - The ID of the customer making the booking.
 * @returns The newly created Booking object.
 */
export async function createBooking(booking: Omit<Booking, 'id' | 'status' | 'createdAt' | 'userId'>, userId: string): Promise<Booking> {
  const bookingData = {
    ...booking,
    userId: userId, // Link the booking to the customer's userId
    status: 'pending', // Status must be a literal type that matches the BookingStatus union
    createdAt: Date.now(),
  };

  const colRef = collection(db, 'bookings');
  const docRef = await addDoc(colRef, bookingData);
  
  // Use 'as Booking' assertion to confirm the return type structure matches the interface
  return { id: docRef.id, ...bookingData } as Booking;
}

/**
 * Sets up a real-time listener for a user's bookings, ordered by creation date descending.
 * @param userId - The ID of the customer.
 * @param callback - Function to handle the updated list of bookings.
 * @returns A function to unsubscribe from the listener.
 */
export function onSnapshotUserBookings(userId: string, callback: (bookings: Booking[]) => void) {
  const q = query(
    collection(db, 'bookings'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map(doc => ({
      // Cast the data to the correct Booking type structure
      ...doc.data() as Omit<Booking, 'id'>, 
      id: doc.id,
    }) as Booking);
    callback(bookings);
  }, (error) => {
    console.error("Error listening to user bookings:", error);
    // You might want to pass the error to the callback or handle it in the calling component
    callback([]); 
  });

  return unsubscribe;
}
