/*
  Script: unset-super-admin-branch.ts
  Purpose: Remove the `branch` field from all super admin (role = 3) user profiles in Firestore.

  How to run (option A - with ts-node):
  - Install dependencies in the repo root (or rebookingSystem):
      npm i -D ts-node typescript
      npm i firebase-admin
  - Set env var GOOGLE_APPLICATION_CREDENTIALS to your service account JSON.
  - Run:
      npx ts-node scripts/unset-super-admin-branch.ts

  How to run (option B - compile + node):
  - tsc scripts/unset-super-admin-branch.ts --esModuleInterop --lib es2020,dom --module commonjs --target es2020
  - node scripts/unset-super-admin-branch.js

  WARNING: This requires a Firebase service account with read/write access to Firestore.
*/

import * as admin from 'firebase-admin';

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp({
      // Uses GOOGLE_APPLICATION_CREDENTIALS env var
    });
  }

  const db = admin.firestore();
  const accounts = db.collection('rebooking-accounts');

  const snapshot = await accounts.where('role', '==', 3).get();
  if (snapshot.empty) {
    console.log('No super admin profiles found.');
    return;
  }

  let updated = 0;
  const batch = db.batch();

  snapshot.docs.forEach((docRef) => {
    const data = docRef.data() as any;
    if (Object.prototype.hasOwnProperty.call(data, 'branch')) {
      batch.update(docRef.ref, { branch: admin.firestore.FieldValue.delete() });
      updated += 1;
    }
  });

  if (updated > 0) {
    await batch.commit();
    console.log(`Unset branch on ${updated} super admin profile(s).`);
  } else {
    console.log('All super admin profiles already have no branch.');
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
