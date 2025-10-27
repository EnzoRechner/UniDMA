import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Bell, BellOff } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase-initilisation';
import { fetchUserData } from './customer-service';
import { UserProfile } from '../lib/types';
import { ROLES } from '../lib/typesConst';

// Local type for notification preferences stored under 'notificationPreferences/{userId}'
export type NotificationPreferences = {
  pushNotificationsEnabled: boolean;
  bookingConfirmedEnabled: boolean;
  bookingRejectedEnabled: boolean;
  newBookingStaffEnabled: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

async function getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  const prefRef = doc(db, 'notificationPreferences', userId);
  const snap = await getDoc(prefRef);
  return snap.exists() ? (snap.data() as NotificationPreferences) : null;
}

async function createDefaultNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const defaults: NotificationPreferences = {
    pushNotificationsEnabled: true,
    bookingConfirmedEnabled: true,
    bookingRejectedEnabled: true,
    newBookingStaffEnabled: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  await setDoc(doc(db, 'notificationPreferences', userId), defaults);
  return defaults;
}

async function updateNotificationPreferences(userId: string, update: Partial<NotificationPreferences>): Promise<void> {
  await updateDoc(doc(db, 'notificationPreferences', userId), {
    ...update,
    updatedAt: Timestamp.now(),
  });
}

interface NotificationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationSettingsModal({
  visible,
  onClose,
}: NotificationSettingsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (visible) {
      loadUserAndPreferences();
    }
  }, [visible]);

  const loadUserAndPreferences = async () => {
    try {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) throw new Error('User not found. Please sign in again.');
      setUserId(storedUserId);

      const userProfile = await fetchUserData(storedUserId);
      setProfile(userProfile);

      let prefs = await getNotificationPreferences(storedUserId);
      if (!prefs) {
        prefs = await createDefaultNotificationPreferences(storedUserId);
      }
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Error', 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!userId || !preferences) return;

    try {
      setSaving(true);

      const updatedPrefs = {
        ...preferences,
        [key]: value,
      };

      if (key === 'pushNotificationsEnabled' && !value) {
        updatedPrefs.bookingConfirmedEnabled = false;
        updatedPrefs.bookingRejectedEnabled = false;
        updatedPrefs.newBookingStaffEnabled = false;
      }

      await updateNotificationPreferences(userId, {
        [key]: value,
        ...(key === 'pushNotificationsEnabled' && !value
          ? {
              bookingConfirmedEnabled: false,
              bookingRejectedEnabled: false,
              newBookingStaffEnabled: false,
            }
          : {}),
      });

      setPreferences(updatedPrefs);
    } catch (error) {
      console.error('Error updating preferences:', error);
      Alert.alert('Error', 'Failed to update notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const renderToggle = (
    label: string,
    description: string,
    key: keyof NotificationPreferences,
    disabled = false
  ) => {
    if (!preferences) return null;

    const value = preferences[key] as boolean;

    return (
      <View style={styles.toggleItem}>
        <View style={styles.toggleContent}>
          <Text style={styles.toggleLabel}>{label}</Text>
          <Text style={styles.toggleDescription}>{description}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={(newValue) => handleToggle(key, newValue)}
          trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: 'rgba(200, 154, 91, 0.6)' }}
          thumbColor={value ? '#C89A5B' : 'rgba(255, 255, 255, 0.8)'}
          disabled={disabled || saving}
          ios_backgroundColor="rgba(255, 255, 255, 0.2)"
        />
      </View>
    );
  };

  const staffRoles: UserProfile['role'][] = [ROLES.STAFF, ROLES.ADMIN, ROLES.SUPER_ADMIN];
  const isStaff = profile ? staffRoles.includes(profile.role) : false;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} tint="dark" style={styles.modalBlur}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.headerIcon}>
                <Bell size={24} color="#C89A5B" />
              </View>
              <Text style={styles.modalTitle}>Notification Settings</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <X size={24} color="rgba(255, 255, 255, 0.8)" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#C89A5B" />
                <Text style={styles.loadingText}>Loading preferences...</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.modalContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Master Control</Text>
                  <View style={styles.sectionCard}>
                    {renderToggle(
                      'Push Notifications',
                      'Enable or disable all push notifications',
                      'pushNotificationsEnabled'
                    )}
                  </View>
                </View>

                {preferences?.pushNotificationsEnabled && (
                  <>
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Booking Notifications</Text>
                      <View style={styles.sectionCard}>
                        {renderToggle(
                          'Booking Confirmations',
                          'Get notified when your booking is confirmed',
                          'bookingConfirmedEnabled'
                        )}
                        <View style={styles.divider} />
                        {renderToggle(
                          'Booking Rejections',
                          'Get notified if your booking cannot be confirmed',
                          'bookingRejectedEnabled'
                        )}
                      </View>
                    </View>

                    {isStaff && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Staff Notifications</Text>
                        <View style={styles.sectionCard}>
                          {renderToggle(
                            'New Booking Alerts',
                            'Receive alerts when new bookings are made at your branch',
                            'newBookingStaffEnabled'
                          )}
                        </View>
                      </View>
                    )}
                  </>
                )}

                {!preferences?.pushNotificationsEnabled && (
                  <View style={styles.disabledNotice}>
                    <BellOff size={32} color="rgba(255, 255, 255, 0.4)" />
                    <Text style={styles.disabledTitle}>
                      Push Notifications Disabled
                    </Text>
                    <Text style={styles.disabledDescription}>
                      Enable push notifications above to configure individual notification types
                    </Text>
                  </View>
                )}

                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>About Notifications</Text>
                  <Text style={styles.infoText}>
                    Stay updated with booking confirmations, rejections, and new reservation alerts. You can customize which notifications you receive.
                  </Text>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.doneButton}
              onPress={onClose}
            >
              <BlurView intensity={25} tint="dark" style={styles.doneButtonBlur}>
                <Text style={styles.doneButtonText}>Done</Text>
              </BlurView>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBlur: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'rgba(13, 13, 13, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200, 154, 91, 0.2)',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(200, 154, 91, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    marginLeft: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(200, 154, 91, 0.8)',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.3)',
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  toggleContent: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(200, 154, 91, 0.2)',
    marginLeft: 16,
  },
  disabledNotice: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginVertical: 20,
  },
  disabledTitle: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay-Bold',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 16,
    marginBottom: 8,
  },
  disabledDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: 'rgba(200, 154, 91, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.3)',
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#C89A5B',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },
  doneButton: {
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(200, 154, 91, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.6)',
  },
  doneButtonBlur: {
    padding: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#C89A5B',
  },
});
