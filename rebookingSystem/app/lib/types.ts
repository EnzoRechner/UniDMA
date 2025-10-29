import { Timestamp } from 'firebase/firestore';
// Removed unused JSX and React Native style imports
import { BranchId, RestaurantId, RoleId } from './typesConst';
/**
 * Interface representing a user document in the 'users' Firestore collection.
 */
export interface UserProfile {
  userId: string; // The Firestore document ID
  createdAt: Timestamp; // Account creation timestamp
  nagName: string; // Name of the user
  email: string; // Unique email identifier
  DOB?: string; // Date of Birth but only needed in loyalty program
  role: RoleId; // 0: customer, 1: staff, 2: admin, 3: super admin
  branch: BranchId; // Branch assigned (for staff/admin) or most frequented (for customers) (don't need to keep it seperated)
  restaurant?: RestaurantId // Restaurant associated with the Admin 
  preferredSeating?: string; // e.g., "indoor", "outdoor", "window", etc.
}
/**
 * Interface representing a reservation document in the 'reservations' Firestore collection.
 */
export interface ReservationDetails {
  id?: string; // The Firestore document ID
  branch: BranchId; // Branch where the reservation is made (numeric id)
  createdAt: Timestamp; // Unix timestamp
  dateOfArrival: Timestamp; // Date of arrival in 'YYYY-MM-DD' format
  date?: string; // Date of arrival in 'YYYY-MM-DD' format
  time?: string; // Time of arrival in 'HH:mm' format
  message?: string;
  guests: number; // Number of guests
  status: 0 | 1 | 2 | 3 | 4 | 5; // Reservation status (0: pending, 1: confirmed, 2: rejected, 3: completed, 4: cancelled, 5: paused)
  userId?: string; // The ID of the user who made the reservation
  bookingName: string; // Name of the booking
  nagName?: string; // Name of the user who made the reservation
  restaurant?: string; // Restaurant associated with the reservation
  rejectionReason?: string; // Reason for rejection, if applicable
  seat: string; // The location of the seat area
}

export interface Branch {
  id: string; // The Firestore document ID
  name: string; // Name of the branch
  restaurant: RestaurantId; // Restaurant name
  location?: string; // Coordinates
  address?: string; // Full address
  capacity?: number;
  open?: string; // e.g., "09:00"
}
// Lightweight coordinate type for Expo/React Native usage
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface BranchDetails {
  id: string; // Firestore document ID
  Coord?: Coordinates; // Geographic coordinates of the branch
  address: string;
  capacity: number;
  name: string;
  open: boolean;
  restaurant: RestaurantId; // numeric enum id
  branchCode?: number; // optional numeric branch code used for filtering
  pauseBookings?: boolean;
  pauseReason?: string;
  pauseUntil?: Timestamp;
}

export default {};