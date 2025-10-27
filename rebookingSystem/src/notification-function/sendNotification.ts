import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface NotificationRequest {
  userId: string;
  notificationType: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const sendNotification = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const payload = data as NotificationRequest;
  const { userId, notificationType, title, body, data: notificationData } = payload;

  if (!userId || !notificationType || !title || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  try {
    const db = admin.firestore();

    const tokensSnapshot = await db
      .collection('deviceTokens')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .get();

    if (tokensSnapshot.empty) {
      console.log('No active tokens found for user:', userId);
      return { message: 'No active devices found', sent: 0 };
    }

    const fcmTokens = tokensSnapshot.docs.map(doc => doc.data().fcmToken);

    const message: admin.messaging.MulticastMessage = {
      tokens: fcmTokens,
      notification: {
        title,
        body,
      },
      data: notificationData || {},
      android: {
        priority: 'high',
        notification: {
          channelId: notificationType === 'new_booking' ? 'staff' : 'bookings',
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

    console.log(`Successfully sent ${response.successCount} notifications`);

    await db.collection('notificationRecords').add({
      userId,
      bookingId: notificationData?.bookingId || null,
      notificationType,
      title,
      body,
      dataPayload: notificationData || {},
      deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
    };
  } catch (error) {
    console.error('Error sending notification:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send notification');
  }
});
