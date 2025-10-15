import { Timestamp } from 'firebase/firestore';

// Using a const assertion for strongly-typed branch IDs
export const BRANCHES = {
  PAARL: 0,
  BELLVILLE: 1,
  SOMERSET_WEST: 2,
} as const;

export const RESTAURANT = {
  DIENAGUIL: 0
} as const;

// Using a const assertion for strongly-typed role IDs
export const ROLES = {
  CUSTOMER: 0,
  STAFF: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
} as const;

// Create a type from the const values
export type BranchId = typeof BRANCHES[keyof typeof BRANCHES];
export type RoleId = typeof ROLES[keyof typeof ROLES];
export type RestaurantId = typeof RESTAURANT[keyof typeof RESTAURANT];

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
  id: BranchId;
  Coord: GeolocationCoordinates; 
  address: string;
  capacity: number;
  name: string;
  open: boolean;
  restaurant: string;

}
