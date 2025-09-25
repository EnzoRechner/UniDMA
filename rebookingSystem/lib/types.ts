// Shared types and interfaces for the application to ensure consistency and strong typing.

/**
 * Interface representing a user document in the 'users' Firestore collection.
 */
export interface User {
  email: string;
  password: string; // Note: Storing plain passwords is not secure. This is for demonstration.
  nagName: string;
  DOB: string;
  role: number;
}

/**
 * Interface representing a booking document in the 'bookings' Firestore collection.
 */
export interface Booking {
  id: string; // The Firestore document ID
  userId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  branch: string;
  seats: number;
  message: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: number; // Unix timestamp
}

export default {};