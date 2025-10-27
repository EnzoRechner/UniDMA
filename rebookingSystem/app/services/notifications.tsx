import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from './firebase-initilisation';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  Timestamp,
  setDoc,
} from 'firebase/firestore';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // Web-specific presentation flags to satisfy typings in newer Expo
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Use the default Firebase app initialized by our firebase-initilisation module
const functions = getFunctions();

export class NotificationService {
  private static instance: NotificationService;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#C89A5B',
        });

        await Notifications.setNotificationChannelAsync('bookings', {
          name: 'Booking Updates',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
        });

        await Notifications.setNotificationChannelAsync('staff', {
          name: 'Staff Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#F59E0B',
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // --- Local Firestore helpers (replacing external utils) ---
  private async saveDeviceToken(
    userId: string,
    fcmToken: string,
    platform: 'ios' | 'android',
    meta?: { deviceName?: string; appVersion?: string }
  ): Promise<void> {
    const tokensRef = collection(db, 'deviceTokens');
    // Upsert by userId + token
    const existing = await getDocs(query(tokensRef, where('userId', '==', userId), where('fcmToken', '==', fcmToken)));
    if (!existing.empty) {
      const docRef = existing.docs[0].ref;
      await updateDoc(docRef, { isActive: true, platform, updatedAt: Timestamp.now(), ...meta });
    } else {
      await addDoc(tokensRef, {
        userId,
        fcmToken,
        platform,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ...(meta || {}),
      });
    }
  }

  private async deactivateUserTokens(userId: string): Promise<void> {
    const tokensRef = collection(db, 'deviceTokens');
    const qs = await getDocs(query(tokensRef, where('userId', '==', userId), where('isActive', '==', true)));
    const updates = qs.docs.map((d) => updateDoc(d.ref, { isActive: false, updatedAt: Timestamp.now() }));
    await Promise.all(updates);
  }

  private async getNotificationPreferences(userId: string): Promise<any> {
    const prefRef = doc(db, 'notificationPreferences', userId);
    const snap = await getDoc(prefRef);
    if (snap.exists()) return snap.data();
    // Default preferences if none set
    const defaults = {
      pushNotificationsEnabled: true,
      bookingConfirmedEnabled: true,
      bookingRejectedEnabled: true,
      newBookingStaffEnabled: true,
    };
    await setDoc(prefRef, { ...defaults, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    return defaults;
  }

  private async saveNotificationRecord(record: {
    userId: string;
    bookingId?: string | null;
    notificationType: string;
    title: string;
    body: string;
    dataPayload?: Record<string, any>;
  }): Promise<void> {
    await addDoc(collection(db, 'notificationRecords'), {
      ...record,
      deliveredAt: null,
      createdAt: Timestamp.now(),
    });
  }
  // -----------------------------------------------------------

  async registerForPushNotifications(userId: string): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('User denied notification permissions');
        return null;
      }
      if (Platform.OS === 'web') {
        console.log('FCM is not supported on web in this app; skipping token registration');
        return null;
      }
      // Request FCM registration token via RNFirebase Messaging (dynamic import)
      const messaging = (await import('@react-native-firebase/messaging')).default;
      await messaging().registerDeviceForRemoteMessages();
      const fcmToken = await messaging().getToken();
      const platform = Platform.OS as 'ios' | 'android';

      await this.saveDeviceToken(userId, fcmToken, platform, {
        deviceName: Platform.OS,
        appVersion: '1.0.0',
      });

      // Listen for token refresh events and update stored token
      messaging().onTokenRefresh(async (newToken: string) => {
        try {
          await this.saveDeviceToken(userId, newToken, platform, {
            deviceName: Platform.OS,
            appVersion: '1.0.0',
          });
        } catch (e) {
          console.error('Failed to update refreshed FCM token', e);
        }
      });

      return fcmToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  async unregisterPushNotifications(userId: string): Promise<void> {
    try {
      await this.deactivateUserTokens(userId);
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
    }
  }

  setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ): void {
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      }
    );

    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        if (onNotificationResponse) {
          onNotificationResponse(response);
        }
      }
    );
  }

  removeNotificationListeners(): void {
    if (this.notificationListener?.remove) this.notificationListener.remove();
    if (this.responseListener?.remove) this.responseListener.remove();
    this.notificationListener = null;
    this.responseListener = null;
  }

  async sendBookingConfirmationNotification(
    userId: string,
    bookingId: string,
    bookingDetails: {
      customerName: string;
      date: string;
      time: string;
      guests: number;
      branch: string;
    }
  ): Promise<void> {
    try {
      const prefs = await this.getNotificationPreferences(userId);
      if (!prefs || !prefs.pushNotificationsEnabled || !prefs.bookingConfirmedEnabled) {
        console.log('User has disabled booking confirmation notifications');
        return;
      }

      const sendNotificationFunction = httpsCallable(functions, 'sendNotification');

      const result = await sendNotificationFunction({
        userId,
        notificationType: 'booking_confirmed',
        title: 'Booking Confirmed',
        body: `Your reservation for ${bookingDetails.guests} at ${bookingDetails.branch} on ${bookingDetails.date} at ${bookingDetails.time} has been confirmed!`,
        data: {
          bookingId,
          type: 'booking_confirmed',
          ...bookingDetails,
        },
      });

      console.log('Booking confirmation sent:', result.data);
    } catch (error) {
      console.error('Error sending booking confirmation notification:', error);
    }
  }

  async sendBookingRejectionNotification(
    userId: string,
    bookingId: string,
    bookingDetails: {
      customerName: string;
      date: string;
      time: string;
      guests: number;
      branch: string;
    },
    rejectionReason: string
  ): Promise<void> {
    try {
      const prefs = await this.getNotificationPreferences(userId);
      if (!prefs || !prefs.pushNotificationsEnabled || !prefs.bookingRejectedEnabled) {
        console.log('User has disabled booking rejection notifications');
        return;
      }

      const sendNotificationFunction = httpsCallable(functions, 'sendNotification');

      const result = await sendNotificationFunction({
        userId,
        notificationType: 'booking_rejected',
        title: 'Booking Update',
        body: `Unfortunately, your reservation for ${bookingDetails.branch} on ${bookingDetails.date} at ${bookingDetails.time} could not be confirmed. Reason: ${rejectionReason}`,
        data: {
          bookingId,
          type: 'booking_rejected',
          rejectionReason,
          ...bookingDetails,
        },
      });

      console.log('Booking rejection sent:', result.data);
    } catch (error) {
      console.error('Error sending booking rejection notification:', error);
    }
  }

  async sendNewBookingNotificationToStaff(
    branchName: string,
    bookingId: string,
    bookingDetails: {
      customerName: string;
      customerId: string;
      date: string;
      time: string;
      guests: number;
      message?: string;
    },
    branchId?: number
  ): Promise<void> {
    try {
      const sendStaffNotificationFunction = httpsCallable(functions, 'sendStaffNotification');

      const result = await sendStaffNotificationFunction({
        branchName,
        branchId,
        notificationType: 'new_booking',
        title: 'New Booking Request',
        body: `New reservation from ${bookingDetails.customerName} (ID: ${bookingDetails.customerId}) for ${bookingDetails.guests} guests on ${bookingDetails.date} at ${bookingDetails.time}`,
        data: {
          bookingId,
          type: 'new_booking',
          branch: branchName,
          ...bookingDetails,
        },
      });

      console.log('Staff notification sent:', result.data);
    } catch (error) {
      console.error('Error sending new booking notification to staff:', error);
    }
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    triggerSeconds = 1
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: triggerSeconds, repeats: false },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }
}

export default NotificationService.getInstance();
