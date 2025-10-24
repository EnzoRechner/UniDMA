import { collection, doc, getDocs, query, where, updateDoc, writeBatch, Timestamp, deleteField } from 'firebase/firestore';
import { db } from '@/app/services/firebase-initilisation';

// Settings shape stored on a Branch document
export interface BranchSettings {
  pauseBookings: boolean;
  pauseReason?: string;
  pauseUntil?: Timestamp;
}

// Internal helper to resolve a Branch doc by its branchCode field
async function getBranchDocRefByCode(branchCode: number | string) {
  // Try numeric match first
  let q1 = query(collection(db, 'Branch'), where('branchCode', '==', Number(branchCode)));
  let snap = await getDocs(q1);
  if (snap.empty) {
    // Fallback: string match in case data was written as string
    const q2 = query(collection(db, 'Branch'), where('branchCode', '==', String(branchCode)));
    snap = await getDocs(q2);
  }
  if (snap.empty) return null;
  const d = snap.docs[0];
  return doc(db, 'Branch', d.id);
}

export async function getBranchSettings(branchCode: number | string): Promise<BranchSettings | null> {
  let q1 = query(collection(db, 'Branch'), where('branchCode', '==', Number(branchCode)));
  let snap = await getDocs(q1);
  if (snap.empty) {
    const q2 = query(collection(db, 'Branch'), where('branchCode', '==', String(branchCode)));
    snap = await getDocs(q2);
  }
  if (snap.empty) return null;
  const data = snap.docs[0].data() as Partial<BranchSettings>;
  return {
    pauseBookings: Boolean(data.pauseBookings),
    pauseReason: data.pauseReason,
    pauseUntil: data.pauseUntil as Timestamp | undefined,
  };
}

/**
 * Creates a clean settings object for Firestore update.
 * - Converts keys with 'undefined' / 'null' values to FieldValue.delete().
 * @param settings The raw settings object (Partial<BranchSettings>).
 * @returns A clean object ready for updateDoc.
 */
function cleanUpdateSettings(settings: Partial<BranchSettings>): object {
  const cleaned: { [key: string]: any } = {};

  for (const key in settings) {
    const value = settings[key as keyof typeof settings];

    if (value === undefined || value === null) {
      cleaned[key] = deleteField();
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export async function updateBranchSettings(
  branchCode: number | string,
  settings: Partial<BranchSettings>
): Promise<void> {
  const ref = await getBranchDocRefByCode(branchCode);
  const cleanedSettings = cleanUpdateSettings(settings);
  if (!ref) throw new Error('Branch not found');
  await updateDoc(ref, cleanedSettings);
}

// Cancels all pending reservations (status 0) for the given branchCode
export async function cancelAllPendingReservations(
  branchCode: number | string,
  reason: string
): Promise<number> {
  // Bookings store branch as a primitive value; existing code mixes string/number
  // We compare as string for consistency
  // Try matching with numeric branch first, then fallback to string
  let bookingsQ = query(
    collection(db, 'nagbookings'),
    where('branch', '==', Number(branchCode)),
    where('status', '==', 0)
  );
  let snap = await getDocs(bookingsQ);
  if (snap.empty) {
    bookingsQ = query(
      collection(db, 'nagbookings'),
      where('branch', '==', String(branchCode)),
      where('status', '==', 0)
    );
    snap = await getDocs(bookingsQ);
  }
  if (snap.empty) return 0;

  let processed = 0;
  // Firestore batch limit 500
  let batch = writeBatch(db);
  let ops = 0;

  for (const d of snap.docs) {
    batch.update(d.ref, { status: 2, rejectionReason: reason });
    ops++;
    processed++;
    if (ops === 450) { // stay under the hard limit and allow room
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
  }
  return processed;
}

// Sets all upcoming (future-dated) pending/confirmed reservations to paused (status 5)
export async function pauseAllUpcomingReservations(
  branchCode: number | string
): Promise<number> {
  const now = Timestamp.now();
  // Try numeric branch first
  let q1 = query(
    collection(db, 'nagbookings'),
    where('branch', '==', Number(branchCode)),
    where('dateOfArrival', '>', now),
    where('status', 'in', [0, 1])
  );
  let snap = await getDocs(q1);
  if (snap.empty) {
    const q2 = query(
      collection(db, 'nagbookings'),
      where('branch', '==', String(branchCode)),
      where('dateOfArrival', '>', now),
      where('status', 'in', [0, 1])
    );
    snap = await getDocs(q2);
  }
  if (snap.empty) return 0;

  let processed = 0;
  let batch = writeBatch(db);
  let ops = 0;
  for (const d of snap.docs) {
    batch.update(d.ref, { status: 5 });
    ops++;
    processed++;
    if (ops === 450) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  return processed;
}

// When unpausing a branch, convert all future paused (status 5) bookings to rejected (status 2)
// so customers must actively rebook, avoiding unintended auto-restores.
export async function rejectAllPausedUpcomingReservations(
  branchCode: number | string,
  reason = 'Branch resumed operations — please rebook your reservation'
): Promise<number> {
  const now = Timestamp.now();
  // Try numeric branch first
  let q1 = query(
    collection(db, 'nagbookings'),
    where('branch', '==', Number(branchCode)),
    where('dateOfArrival', '>', now),
    where('status', '==', 5)
  );
  let snap = await getDocs(q1);
  if (snap.empty) {
    const q2 = query(
      collection(db, 'nagbookings'),
      where('branch', '==', String(branchCode)),
      where('dateOfArrival', '>', now),
      where('status', '==', 5)
    );
    snap = await getDocs(q2);
  }
  if (snap.empty) return 0;

  let processed = 0;
  let batch = writeBatch(db);
  let ops = 0;
  for (const d of snap.docs) {
    batch.update(d.ref, { status: 2, rejectionReason: reason });
    ops++;
    processed++;
    if (ops === 450) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  return processed;
}

export default {};
