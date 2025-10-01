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

export interface Roles {
  customer: boolean;
  staff?: boolean;
  admin?: boolean;
}

/**
 * Interface representing a booking document in the 'bookings' Firestore collection.
 */
export interface Booking {
  id: string; // The Firestore document ID
  custEmail: string;
  userId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  branch: string;
  seats: number;
  message: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'; // Booking status
  createdAt: number; // Unix timestamp
}

export interface Staff {
  id: string; // The Firestore document ID
  email: string;
  password?: string;
  name: string;
  role: number; // e.g., 1 for regular staff, 2 for admin, 3 for manager
  branch: string;
}

export interface Branch {
  id: string; // The Firestore document ID
  name: string;
  restaurant: string;
  location: string;
  capacity: number;
  open: string; // e.g., "09:00"
}
export default {};