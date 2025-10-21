import { Timestamp } from 'firebase/firestore';
import { JSX } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { RoleId, BranchId, RestaurantId } from './typesConst';
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
  branch: string; // Branch where the reservation is made
  createdAt: Timestamp; // Unix timestamp
  dateOfArrival: Timestamp; // Date of arrival in 'YYYY-MM-DD' format
  date?: string; // Date of arrival in 'YYYY-MM-DD' format
  time?: string; // Time of arrival in 'HH:mm' format
  message?: string;
  guests: number; // Number of guests
  status: 0 | 1 | 2 | 3 | 4; // Reservation status     (pending: 0, confirmed: 1, rejected: 2, completed: 3, cancelled: 4)
  userId?: string; // The ID of the user who made the reservation
  bookingName: string; // Name of the booking
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
export interface BranchDetails {  
  id: string; // The Firestore document ID
  //Bid: BranchId;
  Coord: GeolocationCoordinates; 
  address: string;
  capacity: number;
  name: string;
  open: boolean;
  restaurant: string;

}

// --- GLOBAL CACHE DEFINITION (Context, Hook, and Provider) ---
export interface StaffBookingState {
  // Authentication & User Status
  isAuthReady: boolean;
  userId: string | null;
  userRole: number | null; // Represents the RoleId (e.g., 1 for STAFF, 2 for ADMIN)

  // Data Loading Status
  pendingLoading: boolean;
  confirmedLoading: boolean;
  cancelledLoading: boolean;
  
  // Core Data Sets (Filtered by status)
  allBookings: ReservationDetails[];
  pendingBookings: ReservationDetails[];
  confirmedBookings: ReservationDetails[];
  cancelledBookings: ReservationDetails[];
}

export default {};