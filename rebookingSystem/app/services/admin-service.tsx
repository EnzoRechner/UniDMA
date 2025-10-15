import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
  collection,
} from 'firebase/firestore';
import { db } from './firebase-initilisation';
import { ReservationDetails, UserProfile } from '../lib/types';

export interface BranchDetails {
 id: string; // BranchId;
    Coord: GeolocationCoordinates; 
    address: string;
    capacity: number;
    name: string;
    open: boolean;
    restaurant: string;
}

/**
 * Fetches all branches from Firestore.
 * @returns Promise resolving to an array of BranchDetails.
 */
export async function fetchBranches(): Promise<BranchDetails[]> {
  try {
    console.log("Fetching branches from service...");
    const snapshot = await getDocs(collection(db, "Branch"));
    console.log("Documents found:", snapshot.size);

    const branchList: BranchDetails[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as BranchDetails[];

    return branchList;
  } catch (error) {
    console.error("Error fetching branches:", error);
    throw error;
  }
}