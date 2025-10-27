import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface StaffNotificationRequest {
  // Either provide a branchId (number) to match 'branch' field in rebooking-accounts,
  // or provide a branchName string if your profiles store names. Prefer branchId.
  branchId?: number;
  branchName?: string;
  notificationType: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const sendStaffNotification = functions.https.onCall(async (data: any, context: any) => {
  const payload = data as StaffNotificationRequest;
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  const { branchId, branchName, notificationType, title, body, data: notificationData } = payload;

  if ((!branchId && !branchName) || !notificationType || !title || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  try {
    const db = admin.firestore();

    // Query staff/admin from 'rebooking-accounts' with numeric roles
    let staffQuery = db
      .collection('rebooking-accounts')
      .where('role', 'in', [1, 2, 3]); // staff, admin, super-admin

    if (typeof branchId === 'number') {
      staffQuery = staffQuery.where('branch', '==', branchId);
    } else if (branchName) {
      // If only name is provided and profiles store names, filter by that
      staffQuery = staffQuery.where('branchName', '==', branchName);
    }

    const staffUsersSnapshot = await staffQuery.get();

    if (staffUsersSnapshot.empty) {
      console.log('No staff found for branch filter.');
      return { message: 'No staff found for this branch', sent: 0 };
    }

    const staffUserIds = staffUsersSnapshot.docs.map(doc => doc.id);

    // Firestore 'in' queries are limited to 10 values; chunk staff userIds
    const chunkSize = 10;
    const chunks: string[][] = [];
    for (let i = 0; i < staffUserIds.length; i += chunkSize) {
      chunks.push(staffUserIds.slice(i, i + chunkSize));
    }

    const validTokens: string[] = [];
    const userIdsWithTokens: string[] = [];

    for (const ids of chunks) {
      const snap = await db
        .collection('deviceTokens')
        .where('userId', 'in', ids)
        .where('isActive', '==', true)
        .get();

      for (const tokenDoc of snap.docs) {
        const tokenData = tokenDoc.data();
        const userId = tokenData.userId;

        const prefsDoc = await db
          .collection('notificationPreferences')
          .doc(userId)
          .get();

        if (prefsDoc.exists) {
          const prefs = prefsDoc.data();
          if (prefs?.pushNotificationsEnabled && prefs?.newBookingStaffEnabled) {
            validTokens.push(tokenData.fcmToken);
            userIdsWithTokens.push(userId);
          }
        }
      }
    }

    if (validTokens.length === 0) {
      console.log('No staff with notifications enabled');
      return { message: 'No staff with notifications enabled', sent: 0 };
    }

    const message: admin.messaging.MulticastMessage = {
      tokens: validTokens,
      notification: {
        title,
        body,
      },
      data: notificationData || {},
      android: {
        priority: 'high',
        notification: {
          channelId: 'staff',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`Successfully sent ${response.successCount} notifications to staff`);

    const notificationRecords = userIdsWithTokens.map(userId => ({
      userId,
      bookingId: notificationData?.bookingId || null,
      notificationType,
      title,
      body,
      dataPayload: notificationData || {},
      deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }));

    const batch = db.batch();
    notificationRecords.forEach(record => {
      const docRef = db.collection('notificationRecords').doc();
      batch.set(docRef, record);
    });
    await batch.commit();

    return {
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
    };
  } catch (error) {
    console.error('Error sending staff notification:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send staff notification');
  }
});
