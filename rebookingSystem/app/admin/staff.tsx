import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { Calendar, Mail, Undo2, User, UserMinus, UserPlus } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserProfile } from '../lib/types';
import { getPrettyBranchName } from '../lib/typesConst';
import { getUserProfile } from '../services/auth-service';
import { db } from '../services/firebase-initilisation';
import { modalService } from '../services/modal-Service';

export default function StaffManagementScreen() {
  const router = useRouter();
  const [branchCode, setBranchCode] = useState<number | string | null>(null);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Derived pretty branch name
  const prettyBranch = useMemo(() => (branchCode != null ? getPrettyBranchName(Number(branchCode)) : ''), [branchCode]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
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
        if (profile.role !== 2) {
          router.replace('../staff/staff-dashboard');
          return;
        }
        setBranchCode(profile.branch);
      } catch (e) {
        console.error('Init staff management error:', e);
        router.replace('/');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const fetchStaffForBranch = async (branch: number | string) => {
    try {
      setLoading(true);
      // Try numeric branch match first, then fallback to string
      let q1 = query(collection(db, 'rebooking-accounts'), where('role', '==', 1), where('branch', '==', Number(branch)));
      let snap = await getDocs(q1);
      if (snap.empty) {
        const q2 = query(collection(db, 'rebooking-accounts'), where('role', '==', 1), where('branch', '==', String(branch)));
        snap = await getDocs(q2);
      }
      const results: UserProfile[] = snap.docs.map((d) => ({ ...(d.data() as UserProfile) }));
      setStaffList(results);
    } catch (error) {
      console.error('Error fetching staff profiles:', error);
      modalService.showError('Error', 'Failed to load staff information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchCode != null) {
      fetchStaffForBranch(branchCode);
    }
  }, [branchCode]);

  // Format dates as dd-mm-yyyy
  const two = (n: number) => String(n).padStart(2, '0');
  const formatDateDMY = (d: Date) => `${two(d.getDate())}-${two(d.getMonth() + 1)}-${d.getFullYear()}`;

  const handleBack = () => {
    router.back();
  };

  const handleRemoveStaff = (userId: string) => {
      // Run if confirmed
      const removeStaffLogic = async () => {
          try {
              await updateDoc(doc(db, 'rebooking-accounts', userId), { role: 0 }); 
              modalService.showSuccess('Success', `Staff privileges successfully removed for user ID: ${userId}.`);
              if (branchCode != null) fetchStaffForBranch(branchCode);
              
          } catch (e) {
              modalService.showError('Error', 'Failed to remove staff privileges.');
          }
      };

      modalService.showConfirm(
          'Remove Staff', 
          'This will remove staff privileges for this user. This action cannot be undone. Continue?',
          removeStaffLogic, // Function to execute if the user confirms
          'Remove Staff',
          'Cancel'
      );
  };

  const handleAddStaff = () => {
    router.push('../auth/auth-signup');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']} style={styles.background} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading staff information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If admin has no branch assigned, show a clear message instead of returning null
  if (branchCode == null) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']} style={styles.background} />
        <View style={styles.emptyContainer}>
          <User size={64} color="rgba(200, 154, 91, 0.3)" />
          <Text style={styles.emptyTitle}>No Branch Assigned</Text>
          <Text style={styles.emptySubtitle}>Your admin profile doesn’t have a branch set. Please contact a super admin to assign one.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (staffList.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']} style={styles.background} />
        <View style={styles.emptyContainer}>
          <User size={64} color="rgba(200, 154, 91, 0.3)" />
          <Text style={styles.emptyTitle}>No Staff Found</Text>
          <Text style={styles.emptySubtitle}>No staff member is assigned to this branch</Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleAddStaff}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.actionButtonGradient}>
              <UserPlus size={18} color="white" />
              <Text style={styles.actionButtonText}>Add Staff</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']} style={styles.background} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Staff Management</Text>
            <Text style={styles.headerSubtitle}>Manage {prettyBranch || String(branchCode)} branch staff</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
            <Undo2 size={22} color="#C89A5B" /> 
          </TouchableOpacity>
        </View>
        {staffList.map((staff) => (
          <View key={staff.userId} style={styles.profileCard}>
            <BlurView intensity={30} tint="dark" style={styles.profileCardBlur}>

              <Text style={styles.staffName}>{staff.nagName}</Text>
              <Text style={styles.staffRole}>Branch Staff Member</Text>

              <View style={styles.divider} />

              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Mail size={18} color="#C89A5B" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{staff.email}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Calendar size={18} color="#C89A5B" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Created</Text>
                    <Text style={styles.infoValue}>
                      {staff.createdAt ? formatDateDMY(staff.createdAt.toDate()) : 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.actionButton} onPress={() => handleRemoveStaff(staff.userId)}>
                <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.actionButtonGradient}>
                  <UserMinus size={18} color="white" />
                  <Text style={styles.actionButtonText}>Remove Staff</Text>
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          </View>
        ))}

        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>Access Control</Text>

          <View style={styles.controlCard}>
            <BlurView intensity={25} tint="dark" style={styles.controlCardBlur}>
              <View style={styles.controlHeader}>
                <View style={styles.controlInfo}>
                  <UserPlus size={24} color="#10B981" />
                  <View style={styles.controlTextContainer}>
                    <Text style={styles.controlTitle}>Add Staff Member</Text>
                    <Text style={styles.controlSubtitle}>Create a new staff account for this branch</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.toggleButton} onPress={handleAddStaff}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.toggleButtonGradient}>
                  <Text style={styles.toggleButtonText}>Add Staff</Text>
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
  container: { flex: 1 },
  background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, fontFamily: 'Inter-Regular', color: 'rgba(255, 255, 255, 0.8)' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 24, fontFamily: 'PlayfairDisplay-Bold', color: '#C89A5B', marginTop: 20, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, fontFamily: 'Inter-Regular', color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center' },
  actionButton: { borderRadius: 12, overflow: 'hidden', marginTop: 16 },
  actionButtonGradient: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  actionButtonText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: 'white' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 28, fontFamily: 'PlayfairDisplay-Bold', color: '#C89A5B', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, fontFamily: 'Inter-Regular', color: 'rgba(255, 255, 255, 0.8)' },
  iconButton: { padding: 5 },

  profileCard: { marginHorizontal: 20, marginBottom: 24, borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderWidth: 1, borderColor: 'rgba(200, 154, 91, 0.4)' },
  profileCardBlur: { padding: 24 },
  avatarContainer: { alignItems: 'center', marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(200, 154, 91, 0.2)', borderWidth: 2, borderColor: 'rgba(200, 154, 91, 0.4)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: 'Inter-SemiBold' },
  staffName: { fontSize: 24, fontFamily: 'PlayfairDisplay-Bold', color: 'white', textAlign: 'center', marginBottom: 4 },
  staffRole: { fontSize: 14, fontFamily: 'Inter-Regular', color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', marginBottom: 20 },
  divider: { height: 1, backgroundColor: 'rgba(200, 154, 91, 0.2)', marginBottom: 20 },
  infoSection: { gap: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(200, 154, 91, 0.1)', borderWidth: 1, borderColor: 'rgba(200, 154, 91, 0.3)', justifyContent: 'center', alignItems: 'center' },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 12, fontFamily: 'Inter-Regular', color: 'rgba(255, 255, 255, 0.6)', marginBottom: 2 },
  infoValue: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: 'white' },

  controlSection: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontFamily: 'PlayfairDisplay-Bold', color: '#C89A5B', marginBottom: 16 },
  controlCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderWidth: 1, borderColor: 'rgba(200, 154, 91, 0.4)' },
  controlCardBlur: { padding: 20 },
  controlHeader: { marginBottom: 16 },
  controlInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  controlTextContainer: { flex: 1 },
  controlTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: 'white', marginBottom: 4 },
  controlSubtitle: { fontSize: 13, fontFamily: 'Inter-Regular', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 18 },
  toggleButton: { borderRadius: 12, overflow: 'hidden' },
  toggleButtonGradient: { paddingVertical: 14, alignItems: 'center' },
  toggleButtonText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: 'white' },

  activitySection: { paddingHorizontal: 20, marginBottom: 100 },
  activityCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderWidth: 1, borderColor: 'rgba(200, 154, 91, 0.3)' },
  activityCardBlur: { padding: 32, alignItems: 'center' },
  activityTitle: { fontSize: 18, fontFamily: 'PlayfairDisplay-Bold', color: '#C89A5B', marginTop: 16, marginBottom: 8 },
  activitySubtitle: { fontSize: 14, fontFamily: 'Inter-Regular', color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' },
});