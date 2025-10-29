import {
  doc,
  setDoc,
  getDocs,
  collection,
} from 'firebase/firestore';
import { db } from './firebase-initilisation';
import { BranchDetails } from '../lib/types';

/**
 * Fetches all branches from Firestore.
 * @returns Promise resolving to an array of BranchDetails.
 */
export async function fetchBranches(): Promise<BranchDetails[]> {
  try {
   //console.log("Fetching branches from service...");
    const snapshot = await getDocs(collection(db, "Branch"));
    //console.log("Documents found:", snapshot.size);

    const branchList: BranchDetails[] = snapshot.docs.map((d) => {
      const data = d.data() as Omit<BranchDetails, 'id'>;
      return { id: d.id, ...data };
    });

    return branchList;
  } catch (error) {
    console.log("Error fetching branches:", error);
    throw error;
  }
}


export const addBranch = async (
  branchData: Omit<BranchDetails, 'id'>
): Promise<string> => {
  try {
    
    const newBranchRef = doc(collection(db, 'Branch'));
    await setDoc(newBranchRef, branchData);
    return newBranchRef.id;
  } catch (error) {
    console.log("Error creating branch:", error);
    throw error;
  }
};
    
export const updateBranch = async (
  branchId: string,
  updatedData: Partial<BranchDetails>
): Promise<void> => {
  try {
    const branchRef = doc(db, 'Branch', branchId);
    await setDoc(branchRef, updatedData, { merge: true });
  } catch (error) {
    console.log("Error updating branch:", error);
    throw error;
  }
};

export default {};