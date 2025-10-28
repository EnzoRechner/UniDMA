import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { db } from './firebase-initilisation';
import { supabase } from './supabase-client';
import {
  collection,
  addDoc,
  doc,
  getDoc,
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

// Supabase Edge Functions will be used to send notifications via Expo Push

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
    expoPushToken: string,
    platform: 'ios' | 'android',
    meta?: { deviceName?: string; appVersion?: string }
  ): Promise<void> {
    // Store in Supabase for server-side sending
    // Only include columns that exist in schema to avoid failures
    const { error } = await supabase
      .from('device_tokens')
      .upsert(
        {
          user_id: userId,
          expo_push_token: expoPushToken,
          is_active: true,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,expo_push_token' }
      );
    if (error) {
      console.error('Failed to save Expo push token to Supabase', error);
    }
  }

  private async deactivateUserTokens(userId: string): Promise<void> {
    // Deactivate in Supabase (source of truth for push tokens)
    const { error } = await supabase
      .from('device_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true);
    if (error) {
      console.error('Failed to deactivate tokens in Supabase', error);
    }
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
        console.log('Push notifications token not registered on web in this app; skipping token registration');
        return null;
      }

      // Get Expo push token
      const projectId = (Constants?.expoConfig as any)?.extra?.eas?.projectId || (Constants as any)?.easConfig?.projectId;
      const tokenResp = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined as any);
      const expoPushToken = tokenResp.data;
      const platform = Platform.OS as 'ios' | 'android';

      await this.saveDeviceToken(userId, expoPushToken, platform, {
        deviceName: Platform.OS,
        appVersion: '1.0.0',
      });

      return expoPushToken;
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
      const { data: result, error } = await supabase.functions.invoke('send-notification', {
        body: {
          target: 'user',
          userId,
          notificationType: 'booking_confirmed',
          title: 'Booking Confirmed',
          body: `Your reservation for ${bookingDetails.guests} at ${bookingDetails.branch} on ${bookingDetails.date} at ${bookingDetails.time} has been confirmed!`,
          data: {
            bookingId,
            type: 'booking_confirmed',
            ...bookingDetails,
          },
        },
      });
      if (error) throw error;
      console.log('Booking confirmation sent:', result);
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
      const { data: result, error } = await supabase.functions.invoke('send-notification', {
        body: {
          target: 'user',
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
        },
      });
      if (error) throw error;
      console.log('Booking rejection sent:', result);
    } catch (error) {
      console.error('Error sending booking rejection notification:', error);
    }
  }

  async sendBookingCancellationNotification(
    userId: string,
    bookingId: string,
    bookingDetails: {
      customerName: string;
      date: string;
      time: string;
      guests: number;
      branch: string;
    },
    cancellationReason: string
  ): Promise<void> {
    try {
      const { data: result, error } = await supabase.functions.invoke('send-notification', {
        body: {
          target: 'user',
          userId,
          notificationType: 'booking_cancelled',
          title: 'Booking Cancelled',
          body: `Your reservation for ${bookingDetails.branch} on ${bookingDetails.date} at ${bookingDetails.time} has been cancelled. Reason: ${cancellationReason}`,
          data: {
            bookingId,
            type: 'booking_cancelled',
            cancellationReason,
            ...bookingDetails,
          },
        },
      });
      if (error) throw error;
      console.log('Booking cancellation sent:', result);
    } catch (error) {
      console.error('Error sending booking cancellation notification:', error);
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
      const { data: result, error } = await supabase.functions.invoke('send-notification', {
        body: {
          target: 'staff',
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
        },
      });
      if (error) throw error;
      console.log('Staff notification sent:', result);
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
