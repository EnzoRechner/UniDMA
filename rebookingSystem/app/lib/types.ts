import { Timestamp } from 'firebase/firestore';

// Using a const assertion for strongly-typed branch IDs
export const BRANCHES = {
  PAARL: 0,
  BELLVILLE: 1,
  SOMERSET_WEST: 2,
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

export interface UserProfile {
  // The document ID in Firestore is the 6-digit userId
  userId: string;
  createdAt: Timestamp;
  nagName: string;
  email: string;
  password?: string; // Storing passwords in plaintext is a major security risk
  DOB?: string;
  role: RoleId;
  branch: BranchId;
}

export interface ReservationDetails {
  id: string; // The 6-digit booking ID, which is also the document ID
  branch: BranchId; 
  createdAt: Timestamp; 
  dateOfArrival : Timestamp;
  message?: string;
  guests:  number; 
  status: 0 | 1 | 2 | 3 | 4; // 0-pending, 1-confirmed, 2-rejected, 3-completed, 4-cancelled
  userId: string; // The 6-digit user ID from rebooking-accounts
  nagName: string;
  bookingName: string;
}

