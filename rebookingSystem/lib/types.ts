// Shared types and interfaces for the application to ensure consistency and strong typing.
import { Timestamp } from 'firebase/firestore'; 
/**
 * Interface representing a user document in the 'users' Firestore collection.
 */
export interface UserProfile {
  id?: string; // The Firestore document ID
  role: 0 | 1 | 2 | 3; // 0: customer, 1: staff, 2: admin, 3: super admin
  nagName: string; // Name of the user
  DOB?: string; // Date of Birth but only needed in loyalty program
  email: string; // Unique email identifier
  branch: string; // Branch assigned (for staff/admin) or most frequented (for customers) (don't need to keep it seperated)
  restaurant?: string; // Restaurant associated with the Admin 
  preferredSeating?: string; // e.g., "indoor", "outdoor", "window", etc.
  createdAt: Timestamp; // Account creation timestamp
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
  seat: string; // The location of the seat area
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



export default {};