import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { deleteApp, FirebaseApp, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getReactNativePersistence, initializeAuth, updateProfile } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';
import { Calendar, Eye, EyeOff, Lock, Mail, ShieldMinus, ShieldPlus, Undo2, User, UserMinus, UserPlus } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserProfile } from '../lib/types';
import { getPrettyBranchName, ROLES } from '../lib/typesConst';
import { getUserProfile } from '../services/auth-service';
import { db, firebaseConfig } from '../services/firebase-initilisation';
import { modalService } from '../services/modal-Service';

export default function StaffManagementScreen() {
  const router = useRouter();
  const [branchCode, setBranchCode] = useState<number | string | null>(null);
  const [profilesList, setProfilesList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNagName, setNewNagName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [userRole, setUserRole] = useState<number | null>(null);
  const [activeType, setActiveType] = useState<'STAFF' | 'ADMIN'>('STAFF');
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [branchChangeModalOpen, setBranchChangeModalOpen] = useState(false);
  const [userToReassign, setUserToReassign] = useState<UserProfile | null>(null);
  const [branches, setBranches] = useState<{ code: number; name: string }[]>([]);

  // Derived pretty branch name
  const prettyBranch = useMemo(() => {
    if (branchCode == null) return '';
    const found = branches.find(b => Number(b.code) === Number(branchCode));
    if (found) return found.name;
    // Fallback to static pretty names (legacy constants)
    return getPrettyBranchName(Number(branchCode)) || String(branchCode);
  }, [branchCode, branches]);

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
        // Allow both ADMIN (2) and SUPER_ADMIN (3) to access this page
        if (profile.role !== 2 && profile.role !== 3) {
          router.replace('../staff/staff-dashboard');
          return;
        }
        try { setUserRole(profile.role as any); } catch {}
        // Super admins don't belong to a single branch; default branch will be set after branches load
        if (profile.role === 3) {
          setActiveType('ADMIN');
        } else {
          setBranchCode((profile as any).branch);
        }
        // Subscribe to branches for dynamic listing
        const unsub = onSnapshot(collection(db, 'Branch'), (snap) => {
          const list = snap.docs
            .map(d => d.data() as any)
            .filter(b => typeof b.branchCode === 'number')
            .map(b => ({ code: b.branchCode as number, name: String(b.name || b.branchCode) }));
          // Sort by code ascending for consistency
          list.sort((a, b) => a.code - b.code);
          setBranches(list);
          // If super admin and no branch selected yet, pick first available dynamically
          if (profile.role === 3 && list.length > 0) {
            setBranchCode(prev => (prev == null ? list[0].code : prev));
          }
        });
        return () => { try { unsub(); } catch {} };
      } catch (e) {
        console.log('Init staff management error:', e);
        router.replace('/');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const fetchProfilesForBranch = async (branch: number | string, roleFilter: number) => {
    try {
      setLoading(true);
      // Try numeric branch match first, then fallback to string
      let q1 = query(collection(db, 'rebooking-accounts'), where('role', '==', roleFilter), where('branch', '==', Number(branch)));
      let snap = await getDocs(q1);
      if (snap.empty) {
        const q2 = query(collection(db, 'rebooking-accounts'), where('role', '==', roleFilter), where('branch', '==', String(branch)));
        snap = await getDocs(q2);
      }
      const results: UserProfile[] = snap.docs.map((d) => ({ ...(d.data() as UserProfile) }));
      setProfilesList(results);
    } catch (error) {
      console.log('Error fetching staff profiles:', error);
      modalService.showError('Error', 'Failed to load staff information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchCode != null) {
      const roleFilter = activeType === 'STAFF' ? ROLES.STAFF : ROLES.ADMIN;
      fetchProfilesForBranch(branchCode, roleFilter);
    }
  }, [branchCode, activeType]);

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

  // ---- Account creation (staff/admin) using secondary Firebase app to preserve admin session ----
  const createAccount = async (email: string, password: string, nagName: string, branch: number, role: number) => {
    let secondaryApp: FirebaseApp | null = null;
    try {
      secondaryApp = initializeApp(firebaseConfig, 'secondary-app');
      const secondaryAuth = initializeAuth(secondaryApp, {
        persistence: getReactNativePersistence(AsyncStorage)
      });

      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      try { await updateProfile(cred.user, { displayName: nagName }); } catch {}

      // Create the profile document (document id = uid; store same id in userId as per types)
      const uid = cred.user.uid;
      const profile: UserProfile = {
        userId: uid,
        nagName,
        email,
        branch: branch as any,
        restaurant: 0,
        role: role as any,
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

  const handleRemoveAccount = (userId: string, email?: string, roleLabel?: string) => {
      // Run if confirmed
      const removeStaffLogic = async () => {
          try {
              await deleteDoc(doc(db, 'rebooking-accounts', userId));
              modalService.showSuccess('Success', `${roleLabel || 'Account'} deleted: ${email ?? userId}.`);
              if (branchCode != null) {
                const roleFilter = activeType === 'STAFF' ? ROLES.STAFF : ROLES.ADMIN;
                fetchProfilesForBranch(branchCode, roleFilter);
              }
              
      } catch {
        modalService.showError('Error', 'Failed to remove account.');
      }
      };

      modalService.showConfirm(
          `Remove ${roleLabel || 'Account'}`, 
          'This will remove this user. This action cannot be undone. Continue?',
          removeStaffLogic, // Function to execute if the user confirms
          'Remove',
          'Cancel'
      );
  };

  const handleAddStaff = () => {
    setIsAddVisible(true);
  };

  // Super Admin: open per-user branch change modal
  const openChangeBranchForUser = (user: UserProfile) => {
    setUserToReassign(user);
    setBranchChangeModalOpen(true);
  };

  // Super Admin: reassign user's branch
  const reassignUserBranch = async (newBranch: number) => {
    if (!userToReassign) return;
    try {
  await updateDoc(doc(db, 'rebooking-accounts', userToReassign.userId), { branch: newBranch as any });
  const newName = branches.find(b => b.code === newBranch)?.name || getPrettyBranchName(newBranch) || String(newBranch);
  modalService.showSuccess('Branch Updated', `${userToReassign.nagName} is now assigned to ${newName}.`);
      setBranchChangeModalOpen(false);
      setUserToReassign(null);
      if (branchCode != null) {
        const roleFilter = activeType === 'STAFF' ? ROLES.STAFF : ROLES.ADMIN;
        await fetchProfilesForBranch(branchCode, roleFilter);
      }
    } catch (e: any) {
      modalService.showError('Update Failed', e?.message || 'Could not change branch.');
    }
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
      const roleToCreate = activeType === 'ADMIN' ? ROLES.ADMIN : ROLES.STAFF;
      await createAccount(newEmail.trim(), newPassword, newNagName.trim(), Number(branchCode), roleToCreate);
      modalService.showSuccess('Success', `${activeType === 'ADMIN' ? 'Admin' : 'Staff'} account created successfully`);
      setIsAddVisible(false);
      setNewEmail('');
      setNewPassword('');
      setNewNagName('');
      // Refresh list
      await fetchProfilesForBranch(branchCode, roleToCreate);
    } catch (err: any) {
      modalService.showError('Create Account Failed', err?.message || 'An unknown error occurred.');
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

  if (profilesList.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']} style={styles.background} />
        <View style={styles.emptyContainer}>
          <User size={64} color="rgba(200, 154, 91, 0.3)" />
          <Text style={styles.emptyTitle}>No {activeType === 'ADMIN' ? 'Admins' : 'Staff'} Found</Text>
          <Text style={styles.emptySubtitle}>No {activeType === 'ADMIN' ? 'admin account' : 'staff member'} is assigned to this branch</Text>
          {userRole === 3 && (
            <TouchableOpacity style={[styles.actionButton, { marginTop: 12 }]} onPress={() => setBranchPickerOpen(true)}>
              <LinearGradient colors={["#3B82F6", "#1D4ED8"]} style={styles.actionButtonGradient}>
                <Text style={styles.actionButtonText}>Change Branch</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionButton} onPress={handleAddStaff}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.actionButtonGradient}>
              {activeType === 'ADMIN' ? <ShieldPlus size={18} color="white" /> : <UserPlus size={18} color="white" />}
              <Text style={styles.actionButtonText}>Add {activeType === 'ADMIN' ? 'Admin' : 'Staff'}</Text>
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
                  <Text style={styles.modalTitle}>Add {activeType === 'ADMIN' ? 'Admin' : 'Staff'} Account</Text>
                  <Text style={styles.modalSubtitle}>Create a {activeType === 'ADMIN' ? 'branch admin' : 'staff'} account for {prettyBranch || String(branchCode)}</Text>

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

        {/* Branch Picker Modal for Super Admins (rendered here so it works in empty state too) */}
        <Modal
          visible={branchPickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setBranchPickerOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCenter, { justifyContent: 'center' }]}> 
              <BlurView intensity={40} tint="dark" style={[styles.modalCard, { maxWidth: 420 }]}> 
                <Text style={styles.modalTitle}>Select Branch</Text>
                {branches.length === 0 ? (
                  <Text style={styles.branchItemText}>No branches available</Text>
                ) : (
                  branches.map(({ code, name }) => (
                    <TouchableOpacity
                      key={String(code)}
                      style={[styles.branchItem, Number(branchCode) === Number(code) && styles.branchItemActive]}
                      onPress={() => { setBranchCode(Number(code)); setBranchPickerOpen(false); }}
                    >
                      <Text style={[styles.branchItemText, Number(branchCode) === Number(code) && styles.branchItemTextActive]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                  <TouchableOpacity style={[styles.modalButton, { flex: 1 }]} onPress={() => setBranchPickerOpen(false)}>
                    <LinearGradient colors={["#6B7280", "#4B5563"]} style={styles.modalButtonGradient}>
                      <Text style={styles.modalButtonText}>Close</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
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
            <Text style={styles.headerTitle}>User Management</Text>
            <Text style={styles.headerSubtitle}>Manage {prettyBranch || String(branchCode)} branch {activeType === 'ADMIN' ? 'admins' : 'staff'}</Text>
            {userRole === 3 && (
              <View style={{ marginTop: 8 }}>
                <TouchableOpacity style={[styles.actionButton, { alignSelf: 'flex-start' }]} onPress={() => setBranchPickerOpen(true)}>
                  <LinearGradient colors={["#3B82F6", "#1D4ED8"]} style={styles.actionButtonGradient}>
                    <Text style={styles.actionButtonText}>Change Branch</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
            <Undo2 size={22} color="#C89A5B" /> 
          </TouchableOpacity>
        </View>
        {userRole === 3 && (
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 }}>
            <TouchableOpacity onPress={() => setActiveType('ADMIN')} style={[styles.togglePill, activeType === 'ADMIN' && styles.togglePillActive]}>
              <Text style={[styles.togglePillText, activeType === 'ADMIN' && styles.togglePillTextActive]}>Admins</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveType('STAFF')} style={[styles.togglePill, activeType === 'STAFF' && styles.togglePillActive]}>
              <Text style={[styles.togglePillText, activeType === 'STAFF' && styles.togglePillTextActive]}>Staff</Text>
            </TouchableOpacity>
          </View>
        )}
  {profilesList.map((staff) => (
          <View key={staff.userId} style={styles.profileCard}>
            <BlurView intensity={30} tint="dark" style={styles.profileCardBlur}>

              <Text style={styles.staffName}>{staff.nagName}</Text>
              <Text style={styles.staffRole}>{activeType === 'ADMIN' ? 'Branch Admin' : 'Branch Staff Member'}</Text>

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

              <TouchableOpacity style={styles.actionButton} onPress={() => handleRemoveAccount(staff.userId, staff.email, activeType === 'ADMIN' ? 'Admin' : 'Staff')}>
                <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.actionButtonGradient}>
                  {activeType === 'ADMIN' ? <ShieldMinus size={18} color="white" /> : <UserMinus size={18} color="white" />}
                  <Text style={styles.actionButtonText}>Remove {activeType === 'ADMIN' ? 'Admin' : 'Staff'}</Text>
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
                    <Text style={styles.controlTitle}>Add {activeType === 'ADMIN' ? 'Admin' : 'Staff'} Account</Text>
                    <Text style={styles.controlSubtitle}>Create a new {activeType === 'ADMIN' ? 'branch admin' : 'staff'} account for this branch</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.toggleButton} onPress={handleAddStaff}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.toggleButtonGradient}>
                  <Text style={styles.toggleButtonText}>Add {activeType === 'ADMIN' ? 'Admin' : 'Staff'}</Text>
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
                <Text style={styles.modalTitle}>Add {activeType === 'ADMIN' ? 'Admin' : 'Staff'} Account</Text>
                <Text style={styles.modalSubtitle}>Create a {activeType === 'ADMIN' ? 'branch admin' : 'staff'} account for {prettyBranch || String(branchCode)}</Text>

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
      {/* Branch Picker Modal for Super Admins */}
      <Modal
        visible={branchPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBranchPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCenter, { justifyContent: 'center' }]}> 
            <BlurView intensity={40} tint="dark" style={[styles.modalCard, { maxWidth: 420 }]}> 
              <Text style={styles.modalTitle}>Select Branch</Text>
              {branches.length === 0 ? (
                <Text style={styles.branchItemText}>No branches available</Text>
              ) : (
                branches.map(({ code, name }) => (
                  <TouchableOpacity
                    key={String(code)}
                    style={[styles.branchItem, Number(branchCode) === Number(code) && styles.branchItemActive]}
                    onPress={() => { setBranchCode(Number(code)); setBranchPickerOpen(false); }}
                  >
                    <Text style={[styles.branchItemText, Number(branchCode) === Number(code) && styles.branchItemTextActive]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={[styles.modalButton, { flex: 1 }]} onPress={() => setBranchPickerOpen(false)}>
                  <LinearGradient colors={["#6B7280", "#4B5563"]} style={styles.modalButtonGradient}>
                    <Text style={styles.modalButtonText}>Close</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </View>
      </Modal>
      {/* Per-user Branch Reassignment Modal */}
      <Modal
        visible={branchChangeModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBranchChangeModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCenter, { justifyContent: 'center' }]}> 
            <BlurView intensity={40} tint="dark" style={[styles.modalCard, { maxWidth: 420 }]}> 
              <Text style={styles.modalTitle}>Reassign {userToReassign?.nagName || 'User'}</Text>
              <Text style={styles.modalSubtitle}>Choose a new branch</Text>
              {branches.length === 0 ? (
                <Text style={styles.branchItemText}>No branches available</Text>
              ) : (
                branches.map(({ code, name }) => (
                  <TouchableOpacity
                    key={String(code)}
                    style={[styles.branchItem]}
                    onPress={() => reassignUserBranch(Number(code))}
                  >
                    <Text style={[styles.branchItemText]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={[styles.modalButton, { flex: 1 }]} onPress={() => setBranchChangeModalOpen(false)}>
                  <LinearGradient colors={["#6B7280", "#4B5563"]} style={styles.modalButtonGradient}>
                    <Text style={styles.modalButtonText}>Close</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
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
  togglePill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(200,154,91,0.4)', backgroundColor: 'rgba(0,0,0,0.2)' },
  togglePillActive: { backgroundColor: 'rgba(200,154,91,0.2)', borderColor: 'rgba(200,154,91,0.8)' },
  togglePillText: { color: 'rgba(255,255,255,0.9)' },
  togglePillTextActive: { color: '#C89A5B', fontFamily: 'Inter-SemiBold' },

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
  branchItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  branchItemActive: { backgroundColor: 'rgba(200,154,91,0.2)' },
  branchItemText: { color: 'white', fontSize: 16 },
  branchItemTextActive: { color: '#C89A5B', fontWeight: '700' },
});