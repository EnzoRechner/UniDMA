import { getUserProfile } from '@/app/services/auth-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { AlertTriangle, PauseCircle, PlayCircle, Trash2, Undo2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { modalService } from '../services/modal-Service';

import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cancelAllPendingReservations, getBranchSettings, pauseAllUpcomingReservations, rejectAllPausedUpcomingReservations, updateBranchSettings } from '../../utils/firestore';
import { getPrettyBranchName } from '../lib/typesConst';

export default function BranchSettingsScreen() {
  const router = useRouter();
  const [branchCode, setBranchCode] = useState<number | string | null>(null);
  const [pauseBookings, setPauseBookings] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [pauseUntilText, setPauseUntilText] = useState(''); // Format: YYYY-MM-DD HH:mm (24h)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) {
          router.replace('/auth/auth-login');
          return;
        }
        const profile = await getUserProfile(userId);
        if (!profile) {
          router.replace('/auth/auth-login');
          return;
        }
        // Allow admins (role 2) to manage branch settings for their assigned branch
        if (profile.role !== 2) {
          router.replace('../staff/staff-dashboard');
          return;
        }
        setBranchCode(profile.branch);
      } catch (e) {
        console.error('Init app settings error:', e);
        router.replace('/');
      }
    };
    init();
  }, [router]);

  // Helpers for formatting/parsing local date-time inputs (YYYY-MM-DD HH:mm)
  const two = (n: number) => String(n).padStart(2, '0');
  function formatDateTimeLocal(d: Date): string {
    const y = d.getFullYear();
    const m = two(d.getMonth() + 1);
    const day = two(d.getDate());
    const hh = two(d.getHours());
    const mm = two(d.getMinutes());
    return `${y}-${m}-${day} ${hh}:${mm}`;
  }
  function parseDateTimeLocal(s: string): Date | null {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
    if (!m) return null;
  const [, yy, mo, dd, hh, mm] = m;
    const date = new Date(
      Number(yy),
      Number(mo) - 1,
      Number(dd),
      Number(hh),
      Number(mm),
      0,
      0
    );
    return isNaN(date.getTime()) ? null : date;
  }
  const setPauseUntilRelativeHours = (hours: number) => {
    const base = new Date();
    base.setHours(base.getHours() + hours);
    setPauseUntilText(formatDateTimeLocal(base));
  };
  const setPauseUntilRelativeDays = (days: number) => {
    const base = new Date();
    base.setDate(base.getDate() + days);
    setPauseUntilText(formatDateTimeLocal(base));
  };

  const handleBack = () => {
      router.back();
    };

  const fetchSettings = async () => {
    if (branchCode == null) return;
    try {
      setLoading(true);
      const settings = await getBranchSettings(branchCode);
      if (settings) {
        setPauseBookings(Boolean(settings.pauseBookings));
        setPauseReason(settings.pauseReason || '');
        if (settings.pauseUntil) {
          const d = (settings.pauseUntil as Timestamp).toDate();
          setPauseUntilText(formatDateTimeLocal(d));
        } else {
          setPauseUntilText('');
        }
      } else {
        setPauseBookings(false);
        setPauseReason('');
        setPauseUntilText('');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      modalService.showError('Error', 'Failed to load branch settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchCode != null) {
      fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchCode]);

  const handleTogglePauseBookings = async (value: boolean) => {
    if (branchCode == null) return;

    if (value && !pauseReason.trim()) {
      modalService.showError('Error', 'Please provide a reason for pausing bookings');
      return;
    }

    // Parse optional pause-until value
    let pauseUntilTimestamp: Timestamp | undefined = undefined;
    const trimmed = pauseUntilText.trim();
    if (trimmed.length > 0) {
      const parsed = parseDateTimeLocal(trimmed);
      if (!parsed) {
        modalService.showError('Invalid date/time', 'Use format YYYY-MM-DD HH:mm (24h), e.g., 2025-10-31 18:30');
        return;
      }
      pauseUntilTimestamp = Timestamp.fromDate(parsed);
    }

    try {
      setSaving(true);
      await updateBranchSettings(branchCode, {
        pauseBookings: value,
        pauseReason: value ? pauseReason.trim() : undefined,
        pauseUntil: value ? pauseUntilTimestamp : undefined,
      });
      // If pausing, set all upcoming bookings to paused (status 5)
      if (value) {
        const pausedCount = await pauseAllUpcomingReservations(branchCode);
        if (pausedCount > 0) {
          console.log(`Paused ${pausedCount} upcoming reservations for branch ${branchCode}`);
        }
      } else {
        // If unpausing, clear all paused upcoming bookings by rejecting them
        const rejectedCount = await rejectAllPausedUpcomingReservations(
          branchCode,
          'Branch has resumed operations — please rebook your reservation'
        );
        if (rejectedCount > 0) {
          console.log(`Rejected ${rejectedCount} previously paused reservations for branch ${branchCode}`);
        }
      }
      setPauseBookings(value);
      modalService.showError(
        'Success',
        value
          ? 'Bookings have been paused. New reservations are disabled.'
          : 'Bookings have been resumed. Previously paused reservations were rejected; customers must rebook.'
      );
      await fetchSettings();
    } catch (error) {
      console.log('Error toggling pause bookings:', error);
      modalService.showError('Error', 'Failed to update booking status');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAllPending = () => {
    if (branchCode == null) return;

    // This needs to be changed to use modalService
    Alert.alert(
      'Cancel All Pending Reservations',
      'This will reject ALL pending reservations for this branch. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const cancelledCount = await cancelAllPendingReservations(
                branchCode,
                'Branch manager cancelled all pending reservations'
              );

              modalService.showError(
                'Success',
                `${cancelledCount} pending reservation${cancelledCount !== 1 ? 's' : ''} have been cancelled.`
              );
            } catch (error) {
              console.error('Error cancelling reservations:', error);
              modalService.showError('Error', 'Failed to cancel pending reservations');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (branchCode == null) {
    return null;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
          style={styles.background}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
        style={styles.background}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Application Settings</Text>
          <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
            <Undo2 size={22} color="#C89A5B" /> 
          </TouchableOpacity>
          <Text style={styles.headerSubtitle}>
            Manage {getPrettyBranchName(Number(branchCode)) || String(branchCode)} branch configuration
          </Text>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Booking Control</Text>

          <View style={styles.settingCard}>
            <BlurView intensity={25} tint="dark" style={styles.settingCardBlur}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  {pauseBookings ? (
                    <PauseCircle size={24} color="#EF4444" />
                  ) : (
                    <PlayCircle size={24} color="#10B981" />
                  )}
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Pause All Bookings</Text>
                    <Text style={styles.settingSubtitle}>
                      {pauseBookings
                        ? 'New reservations are currently disabled'
                        : 'Customers can make new reservations'
                      }
                    </Text>
                  </View>
                </View>
                <Switch
                  value={pauseBookings}
                  onValueChange={handleTogglePauseBookings}
                  trackColor={{ false: '#3e3e3e', true: '#EF4444' }}
                  thumbColor={pauseBookings ? '#ffffff' : '#f4f3f4'}
                  disabled={saving}
                />
              </View>

              <View style={styles.reasonContainer}>
                <Text style={styles.reasonLabel}>Reason (required when pausing)</Text>
                <BlurView intensity={15} tint="dark" style={styles.reasonInput}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., Fully booked, Maintenance, etc."
                    placeholderTextColor="#666666"
                    value={pauseReason}
                    onChangeText={setPauseReason}
                    multiline
                    numberOfLines={2}
                    editable={!saving}
                  />
                </BlurView>
              </View>

              <View style={styles.reasonContainer}>
                <Text style={styles.reasonLabel}>Pause Until (optional)</Text>
                <BlurView intensity={15} tint="dark" style={styles.reasonInput}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="YYYY-MM-DD HH:mm (24h)"
                    placeholderTextColor="#666666"
                    value={pauseUntilText}
                    onChangeText={setPauseUntilText}
                    editable={!saving}
                  />
                </BlurView>
                <View style={styles.chipRow}>
                  <TouchableOpacity disabled={saving} onPress={() => setPauseUntilRelativeHours(2)} style={styles.chip}><Text style={styles.chipText}>+2h</Text></TouchableOpacity>
                  <TouchableOpacity disabled={saving} onPress={() => setPauseUntilRelativeHours(24)} style={styles.chip}><Text style={styles.chipText}>+24h</Text></TouchableOpacity>
                  <TouchableOpacity disabled={saving} onPress={() => setPauseUntilRelativeDays(7)} style={styles.chip}><Text style={styles.chipText}>+7d</Text></TouchableOpacity>
                  <TouchableOpacity disabled={saving} onPress={() => setPauseUntilText('')} style={styles.chipClear}><Text style={styles.chipText}>Clear</Text></TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </View>
        </View>

        <View style={styles.dangerSection}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>

          <View style={styles.dangerCard}>
            <BlurView intensity={25} tint="dark" style={styles.dangerCardBlur}>
              <View style={styles.dangerHeader}>
                <AlertTriangle size={24} color="#EF4444" />
                <View style={styles.dangerTextContainer}>
                  <Text style={styles.dangerTitle}>Cancel All Pending</Text>
                  <Text style={styles.dangerSubtitle}>
                    Reject all pending reservations for this branch. This cannot be undone.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.dangerButton}
                onPress={handleCancelAllPending}
                disabled={saving}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={styles.dangerButtonGradient}
                >
                  <Trash2 size={18} color="white" />
                  <Text style={styles.dangerButtonText}>Cancel All Pending</Text>
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  settingsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    marginBottom: 16,
  },
  settingCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
  },
  settingCardBlur: {
    padding: 20,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },
  reasonContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(200, 154, 91, 0.2)',
  },
  reasonLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    marginBottom: 8,
  },
  reasonInput: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    padding: 12,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(200, 154, 91, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
  },
  chipClear: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  chipText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Inter-SemiBold',
  },
  textInput: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'white',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  dangerSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  dangerCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  dangerCardBlur: {
    padding: 20,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  dangerTextContainer: {
    flex: 1,
  },
  dangerTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    marginBottom: 4,
  },
  dangerSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },
  dangerButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  dangerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 100,
  },
  infoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.3)',
  },
  infoCardBlur: {
    padding: 32,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    marginTop: 16,
    marginBottom: 8,
  },
  infoSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  iconButton: { padding: 5 },
});
