import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/initialiseFirebase';

// Login: returns userId if found, null otherwise
export async function login(email: string, password: string): Promise<{ userId: string | null, role: 'customer' | 'staff' | null }> {
  const checkCollection = async (colName: string) => {
    const q = query(
      collection(db, colName),
      where('email', '==', email),
      where('password', '==', password)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }
    return null;
  };
  const customerId = await checkCollection('customer');
  if (customerId) return { userId: customerId, role: 'customer' };
  const staffId = await checkCollection('staff');
  if (staffId) return { userId: staffId, role: 'staff' };
  return { userId: null, role: null };
}

// Create a document in a collection
export async function createDoc(collectionName: string, data: any) {
  const colRef = collection(db, collectionName);
  const docRef = await addDoc(colRef, data);
  return docRef.id;
}

// Read documents from a collection with optional filters
export async function readDocs(collectionName: string, filters?: { field: string, op: any, value: any }[]) {
  const colRef = collection(db, collectionName);
  let q: any = colRef;
  if (filters && filters.length > 0) {
    const qFilters = filters.map(f => where(f.field, f.op, f.value));
    q = query(colRef, ...qFilters);
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return { id: doc.id, ...(typeof data === 'object' && data !== null ? data : {}) };
  });
}

// Update a document by id
export async function updateDocById(collectionName: string, docId: string, data: any) {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, data);
}

// Delete a document by id
export async function deleteDocById(collectionName: string, docId: string) {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}
