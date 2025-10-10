// Shared types and interfaces for the application to ensure consistency and strong typing.
import { Timestamp } from 'firebase/firestore'; 
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
 * Interface representing a reservation document in the 'reservations' Firestore collection.
 */
export interface ReservationDetails {
  id?: string; // The Firestore document ID
  branch: string; // Branch where the reservation is made
  createdAt: Timestamp; // Unix timestamp
  dateOfArrival: Timestamp; // Date of arrival in 'YYYY-MM-DD' format
  date?: string; // Date of arrival in 'YYYY-MM-DD' format
  time?: string; // Time of arrival in 'HH:mm' format
  message?: string;
  guests: number; // Number of guests
  status: 0 | 1 | 2 | 3 | 4; // Reservation status     (pending: 0, confirmed: 1, rejected: 2, completed: 3, cancelled: 4)
  userId?: string; // The ID of the user who made the reservation
  nagName: string; // Name under which the reservation was made
  bookingName: string; // Name of the booking
  restaurant?: string; // Restaurant associated with the reservation
  rejectionReason?: string; // Reason for rejection, if applicable
  seat: string; // The location of the seat number
}

export interface Staff {
  id: string; // The Firestore document ID
  email: string;
  password?: string;
  name: string;
  role: number; // e.g., 1 for regular staff, 2 for admin, 3 for manager
  branch: string;
  restaurant: string;
}

export interface Branch {
  id: string; // The Firestore document ID
  name: string; // Name of the branch
  restaurant: string; // Restaurant name
  location?: string; // Coordinates
  address?: string; // Full address
  capacity?: number;
  open?: string; // e.g., "09:00"
}

export interface UserProfile {
  role: 'user' | 'admin';
  adminBranch?: string; // Only for admin users
  id?: string;
  displayName: string;
  email: string;
  preferredBranch: string;
  preferredSeating: string;
  createdAt: Timestamp;
}

export default {};