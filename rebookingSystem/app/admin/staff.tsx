import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, query, where, Timestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { Calendar, Mail, Undo2, User, UserMinus, UserPlus, Lock, Eye, EyeOff } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserProfile } from '../lib/types';
import { getPrettyBranchName, ROLES } from '../lib/typesConst';
import { getUserProfile } from '../services/auth-service';
import { db, firebaseConfig } from '../services/firebase-initilisation';
import { modalService } from '../services/modal-Service';
import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

export default function StaffManagementScreen() {
  const router = useRouter();
  const [branchCode, setBranchCode] = useState<number | string | null>(null);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNagName, setNewNagName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

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
        console.log('Init staff management error:', e);
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
      console.log('Error fetching staff profiles:', error);
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

  // ---- Password validation (mirrors auth-signup) ----
  const validatePassword = (password: string) => {
    const minLength = 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) return 'Password must be at least 6 characters long';
    if (!hasUpperCase) return 'Password must contain at least one uppercase letter';
    if (!hasLowerCase) return 'Password must contain at least one lowercase letter';
    if (!hasNumbers) return 'Password must contain at least one number';
    if (!hasSpecialChar) return 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)';
    return null;
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    if (strength <= 2) return { level: 'weak', color: '#EF4444' } as const;
    if (strength <= 3) return { level: 'medium', color: '#F59E0B' } as const;
    if (strength <= 4) return { level: 'strong', color: '#10B981' } as const;
    return { level: 'very strong', color: '#059669' } as const;
  };

  // ---- Staff creation using secondary Firebase app to preserve admin session ----
  const createStaffAccount = async (email: string, password: string, nagName: string, branch: number) => {
    let secondaryApp: FirebaseApp | null = null;
    try {
      secondaryApp = initializeApp(firebaseConfig, 'secondary-app');
      const secondaryAuth = initializeAuth(secondaryApp, {
        persistence: getReactNativePersistence(AsyncStorage)
      });

      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      try { await updateProfile(cred.user, { displayName: nagName }); } catch {}

      // Create the staff profile document (document id = uid; store same id in userId as per types)
      const uid = cred.user.uid;
      const profile: UserProfile = {
        userId: uid,
        nagName,
        email,
        branch: branch as any,
        restaurant: 0,
        role: ROLES.STAFF,
        createdAt: Timestamp.now(),
      };
      await setDoc(doc(db, 'rebooking-accounts', uid), profile as any);
      return uid;
    } finally {
      if (secondaryApp) {
        try { await deleteApp(secondaryApp); } catch {}
      }
    }
  };

  const handleBack = () => {
    // If there's no history stack (e.g., deep link or first screen),
    // router.back() will throw "The action 'GO_BACK' was not handled".
    // Guard it and fall back to the Admin Dashboard.
    if (router.canGoBack && router.canGoBack()) {
      router.back();
    } else {
      router.replace('/admin/admin-dashboard-page');
    }
  };

  const handleRemoveStaff = (userId: string) => {
      // Run if confirmed
      const removeStaffLogic = async () => {
          try {
              await deleteDoc(doc(db, 'rebooking-accounts', userId));
              modalService.showSuccess('Success', `Staff account deleted: ${userId}.`);
              if (branchCode != null) fetchStaffForBranch(branchCode);
              
      } catch {
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
    setIsAddVisible(true);
  };

  const handleCreateStaff = async () => {
    if (!newEmail.trim() || !newNagName.trim() || !newPassword.trim()) {
      modalService.showError('Error', 'Please fill in all fields');
      return;
    }
    if (!newEmail.includes('@')) {
      modalService.showError('Error', 'Please enter a valid email address');
      return;
    }
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      modalService.showError('Password Requirements', passwordError);
      return;
    }
    if (branchCode == null) {
      modalService.showError('Error', 'No branch is assigned to your admin account.');
      return;
    }

    setCreating(true);
    try {
      await createStaffAccount(newEmail.trim(), newPassword, newNagName.trim(), Number(branchCode));
      modalService.showSuccess('Success', 'Staff account created successfully');
      setIsAddVisible(false);
      setNewEmail('');
      setNewPassword('');
      setNewNagName('');
      // Refresh list
      await fetchStaffForBranch(branchCode);
    } catch (err: any) {
      modalService.showError('Create Staff Failed', err?.message || 'An unknown error occurred.');
    } finally {
      setCreating(false);
    }
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

        {/* Add Staff Modal (rendered here so it works in empty state too) */}
        <Modal
          visible={isAddVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsAddVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
              <View style={styles.modalCenter}>
                <BlurView intensity={40} tint="dark" style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Add Staff Member</Text>
                  <Text style={styles.modalSubtitle}>Create a staff account for {prettyBranch || String(branchCode)}</Text>

                  {/* Nag Name */}
                  <View style={styles.modalInputContainer}>
                    <BlurView intensity={80} tint="dark" style={styles.modalInputBlur}>
                      <User size={18} color="#C89A5B" style={styles.inputIcon} />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Nag Name"
                        placeholderTextColor="#666666"
                        value={newNagName}
                        onChangeText={setNewNagName}
                        autoCapitalize="words"
                      />
                    </BlurView>
                  </View>

                  {/* Email */}
                  <View style={styles.modalInputContainer}>
                    <BlurView intensity={80} tint="dark" style={styles.modalInputBlur}>
                      <Mail size={18} color="#C89A5B" style={styles.inputIcon} />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Email Address"
                        placeholderTextColor="#666666"
                        value={newEmail}
                        onChangeText={setNewEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </BlurView>
                  </View>

                  {/* Password */}
                  <View style={styles.modalInputContainer}>
                    <BlurView intensity={80} tint="dark" style={styles.modalInputBlur}>
                      <Lock size={18} color="#C89A5B" style={styles.inputIcon} />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Password"
                        placeholderTextColor="#666666"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={18} color="#666666" /> : <Eye size={18} color="#666666" />}
                      </TouchableOpacity>
                    </BlurView>

                    {/* Strength bar */}
                    {newPassword.length > 0 && (
                      <View style={styles.passwordStrengthContainer}>
                        <View style={styles.passwordStrengthBar}>
                          <View
                            style={[
                              styles.passwordStrengthFill,
                              {
                                width: `${(getPasswordStrength(newPassword).level === 'weak' ? 25 :
                                  getPasswordStrength(newPassword).level === 'medium' ? 50 :
                                  getPasswordStrength(newPassword).level === 'strong' ? 75 : 100)}%`,
                                backgroundColor: getPasswordStrength(newPassword).color,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.passwordStrengthText, { color: getPasswordStrength(newPassword).color }]}>
                          {getPasswordStrength(newPassword).level.charAt(0).toUpperCase() + getPasswordStrength(newPassword).level.slice(1)}
                        </Text>
                      </View>
                    )}

                    {/* Requirements */}
                    <View style={styles.passwordRequirements}>
                      <Text style={styles.requirementsTitle}>Password must contain:</Text>
                      <Text style={[styles.requirementItem, newPassword.length >= 6 && styles.requirementMet]}>• At least 6 characters</Text>
                      <Text style={[styles.requirementItem, /[A-Z]/.test(newPassword) && styles.requirementMet]}>• One uppercase letter</Text>
                      <Text style={[styles.requirementItem, /[a-z]/.test(newPassword) && styles.requirementMet]}>• One lowercase letter</Text>
                      <Text style={[styles.requirementItem, /\d/.test(newPassword) && styles.requirementMet]}>• One number</Text>
                      <Text style={[styles.requirementItem, /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) && styles.requirementMet]}>• One special character</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.modalButton} onPress={() => setIsAddVisible(false)} disabled={creating}>
                      <LinearGradient colors={["#6B7280", "#4B5563"]} style={styles.modalButtonGradient}>
                        <Text style={styles.modalButtonText}>Cancel</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalButton} onPress={handleCreateStaff} disabled={creating}>
                      <LinearGradient colors={["#10B981", "#059669"]} style={styles.modalButtonGradient}>
                        {creating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalButtonText}>Create</Text>}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </BlurView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
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
      {/* Add Staff Modal */}
      <Modal
        visible={isAddVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.modalCenter}>
              <BlurView intensity={40} tint="dark" style={styles.modalCard}>
                <Text style={styles.modalTitle}>Add Staff Member</Text>
                <Text style={styles.modalSubtitle}>Create a staff account for {prettyBranch || String(branchCode)}</Text>

                {/* Nag Name */}
                <View style={styles.modalInputContainer}>
                  <BlurView intensity={80} tint="dark" style={styles.modalInputBlur}>
                    <User size={18} color="#C89A5B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Nag Name"
                      placeholderTextColor="#666666"
                      value={newNagName}
                      onChangeText={setNewNagName}
                      autoCapitalize="words"
                    />
                  </BlurView>
                </View>

                {/* Email */}
                <View style={styles.modalInputContainer}>
                  <BlurView intensity={80} tint="dark" style={styles.modalInputBlur}>
                    <Mail size={18} color="#C89A5B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Email Address"
                      placeholderTextColor="#666666"
                      value={newEmail}
                      onChangeText={setNewEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </BlurView>
                </View>

                {/* Password */}
                <View style={styles.modalInputContainer}>
                  <BlurView intensity={80} tint="dark" style={styles.modalInputBlur}>
                    <Lock size={18} color="#C89A5B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Password"
                      placeholderTextColor="#666666"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} color="#666666" /> : <Eye size={18} color="#666666" />}
                    </TouchableOpacity>
                  </BlurView>

                  {/* Strength bar */}
                  {newPassword.length > 0 && (
                    <View style={styles.passwordStrengthContainer}>
                      <View style={styles.passwordStrengthBar}>
                        <View
                          style={[
                            styles.passwordStrengthFill,
                            {
                              width: `${(getPasswordStrength(newPassword).level === 'weak' ? 25 :
                                getPasswordStrength(newPassword).level === 'medium' ? 50 :
                                getPasswordStrength(newPassword).level === 'strong' ? 75 : 100)}%`,
                              backgroundColor: getPasswordStrength(newPassword).color,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.passwordStrengthText, { color: getPasswordStrength(newPassword).color }]}>
                        {getPasswordStrength(newPassword).level.charAt(0).toUpperCase() + getPasswordStrength(newPassword).level.slice(1)}
                      </Text>
                    </View>
                  )}

                  {/* Requirements */}
                  <View style={styles.passwordRequirements}>
                    <Text style={styles.requirementsTitle}>Password must contain:</Text>
                    <Text style={[styles.requirementItem, newPassword.length >= 6 && styles.requirementMet]}>• At least 6 characters</Text>
                    <Text style={[styles.requirementItem, /[A-Z]/.test(newPassword) && styles.requirementMet]}>• One uppercase letter</Text>
                    <Text style={[styles.requirementItem, /[a-z]/.test(newPassword) && styles.requirementMet]}>• One lowercase letter</Text>
                    <Text style={[styles.requirementItem, /\d/.test(newPassword) && styles.requirementMet]}>• One number</Text>
                    <Text style={[styles.requirementItem, /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) && styles.requirementMet]}>• One special character</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalButton} onPress={() => setIsAddVisible(false)} disabled={creating}>
                    <LinearGradient colors={["#6B7280", "#4B5563"]} style={styles.modalButtonGradient}>
                      <Text style={styles.modalButtonText}>Cancel</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalButton} onPress={handleCreateStaff} disabled={creating}>
                    <LinearGradient colors={["#10B981", "#059669"]} style={styles.modalButtonGradient}>
                      {creating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalButtonText}>Create</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' },
  modalCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(0, 0, 0, 0.4)', borderWidth: 1, borderColor: 'rgba(200, 154, 91, 0.5)', padding: 20 },
  modalTitle: { fontSize: 20, fontFamily: 'PlayfairDisplay-Bold', color: '#C89A5B', marginBottom: 6, textAlign: 'center' },
  modalSubtitle: { fontSize: 13, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.7)', marginBottom: 16, textAlign: 'center' },
  modalInputContainer: { marginBottom: 12 },
  modalInputBlur: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: 'rgba(200,154,91,0.4)' },
  modalInput: { flex: 1, height: 52, paddingHorizontal: 16, fontSize: 16, fontFamily: 'Inter-Regular', color: 'white' },
  inputIcon: { marginLeft: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  modalButtonGradient: { paddingVertical: 14, alignItems: 'center' },
  modalButtonText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: 'white' },
  eyeIcon: { paddingHorizontal: 12 },
  passwordStrengthContainer: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  passwordStrengthBar: { flex: 1, height: 4, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 2, overflow: 'hidden' },
  passwordStrengthFill: { height: '100%', borderRadius: 2 },
  passwordStrengthText: { fontSize: 12, fontFamily: 'Inter-SemiBold' },
  passwordRequirements: { marginTop: 12, padding: 12, backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(200, 154, 91, 0.3)' },
  requirementsTitle: { fontSize: 12, fontFamily: 'Inter-SemiBold', color: '#C89A5B', marginBottom: 6 },
  requirementItem: { fontSize: 11, fontFamily: 'Inter-Regular', color: 'rgba(255, 255, 255, 0.6)', marginBottom: 2 },
  requirementMet: { color: '#10B981' },
});