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
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cancelAllPendingReservations, getBranchSettings, pauseAllUpcomingReservations, rejectAllPausedUpcomingReservations, updateBranchSettings } from '../../utils/firestore';
import { BRANCHES, getPrettyBranchName } from '../lib/typesConst';

export default function BranchSettingsScreen() {
  const router = useRouter();
  const [branchCode, setBranchCode] = useState<number | string | null>(null);
  const [userRole, setUserRole] = useState<number | null>(null);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
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
        // Allow admins (role 2) and super admins (role 3) to manage settings
        if (profile.role !== 2 && profile.role !== 3) {
          router.replace('../staff/staff-dashboard');
          return;
        }
        setUserRole(profile.role as any);
        // Super admins don't have a fixed branch; pick a default working context
        if (profile.role === 3) {
          const firstBranch = Number(Object.values(BRANCHES)[0]);
          setBranchCode(firstBranch);
        } else {
          setBranchCode((profile as any).branch);
        }
      } catch (e) {
        console.log('Init app settings error:', e);
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
    } catch {
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
      modalService.showSuccess(
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

  // Cancel Booking Logic that runs on confirmation
  const cancelAllPendingLogic = async () => {
      if (branchCode == null) return; 

      try {
          // Assuming setSaving manages the loading state for this mass action
          setSaving(true); 
          
          const cancelledCount = await cancelAllPendingReservations(
              branchCode,
              'Branch manager cancelled all pending reservations'
          );

          // Success notification (using modalService.showError for the single-button alert)
          modalService.showSuccess(
              'Success',
              `${cancelledCount} pending reservation${cancelledCount !== 1 ? 's' : ''} have been cancelled.`
          );
      } catch (error: any) {
          console.log('Error cancelling reservations:', error);
          modalService.showError('Error', 'Failed to cancel pending reservations');
      } finally {
          setSaving(false);
      }
  };

  const handleCancelAllPending = () => {
    if (branchCode == null) return;

    modalService.showConfirm(
        'Cancel All Pending Reservations',
        'This will reject ALL pending reservations for this branch. This action cannot be undone. Are you sure?',
        cancelAllPendingLogic, // This function runs if the user confirms
        'Confirm', 
        'Cancel'
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
          <View>
            <Text style={styles.headerTitle}>Application Settings</Text>
            <Text style={styles.headerSubtitle}>
              Manage {getPrettyBranchName(Number(branchCode)) || String(branchCode)} branch configuration
            </Text>
            {userRole === 3 && (
              <View style={{ marginTop: 8 }}>
                <TouchableOpacity style={{ borderRadius: 12, overflow: 'hidden', alignSelf: 'flex-start' }} onPress={() => setBranchPickerOpen(true)}>
                  <LinearGradient colors={["#3B82F6", "#1D4ED8"]} style={{ paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 16, fontFamily: 'Inter-SemiBold', color: 'white' }}>Change Branch</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
            <Undo2 size={22} color="#C89A5B" /> 
          </TouchableOpacity>
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
      {/* Branch Picker Modal for Super Admins */}
      <Modal
        visible={branchPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBranchPickerOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <BlurView intensity={40} tint="dark" style={{ width: '100%', borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(200,154,91,0.5)', padding: 20 }}>
            <Text style={{ fontSize: 20, fontFamily: 'PlayfairDisplay-Bold', color: '#C89A5B', marginBottom: 6, textAlign: 'center' }}>Select Branch</Text>
            {Object.values(BRANCHES).map((id) => (
              <TouchableOpacity key={String(id)} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }} onPress={() => { setBranchCode(Number(id)); setBranchPickerOpen(false); }}>
                <Text style={{ color: 'white', fontSize: 16, textAlign: 'center' }}>{getPrettyBranchName(Number(id))}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }} onPress={() => setBranchPickerOpen(false)}>
                <LinearGradient colors={["#6B7280", "#4B5563"]} style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontFamily: 'Inter-SemiBold', color: 'white' }}>Close</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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